param(
  [string]$MonitorPattern = 'G93SC|Odyssey'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;

public static class MonitorDdc {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct PHYSICAL_MONITOR {
    public IntPtr hPhysicalMonitor;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string szPhysicalMonitorDescription;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left, Top, Right, Bottom; }

  delegate bool MonitorEnumProc(IntPtr hMonitor, IntPtr hdc, ref RECT rect, IntPtr data);

  [DllImport("user32.dll")]
  static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, MonitorEnumProc proc, IntPtr data);

  [DllImport("dxva2.dll", SetLastError = true)]
  static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, out uint count);

  [DllImport("dxva2.dll", SetLastError = true)]
  static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, uint count, [Out] PHYSICAL_MONITOR[] monitors);

  [DllImport("dxva2.dll", SetLastError = true)]
  static extern bool DestroyPhysicalMonitor(IntPtr handle);

  [DllImport("dxva2.dll", SetLastError = true)]
  static extern bool GetVCPFeatureAndVCPFeatureReply(IntPtr handle, byte code, out uint codeType, out uint current, out uint maximum);

  [DllImport("dxva2.dll", SetLastError = true)]
  static extern bool SetVCPFeature(IntPtr handle, byte code, uint value);

  const int MaxAttempts = 3;
  const int RetryDelayMilliseconds = 100;

  public static uint[] ReadVcp(string monitorPattern, byte code) {
    return WithTargetMonitor(monitorPattern, handle => {
      int lastError = 0;
      for (int attempt = 1; attempt <= MaxAttempts; attempt++) {
        uint codeType, current, maximum;
        if (GetVCPFeatureAndVCPFeatureReply(handle, code, out codeType, out current, out maximum)) {
          return new uint[] { current, maximum };
        }
        lastError = Marshal.GetLastWin32Error();
        Thread.Sleep(RetryDelayMilliseconds);
      }
      throw new Win32Exception(lastError);
    });
  }

  public static void WriteVcp(string monitorPattern, byte code, uint value) {
    WithTargetMonitor(monitorPattern, handle => {
      int lastError = 0;
      for (int attempt = 1; attempt <= MaxAttempts; attempt++) {
        if (SetVCPFeature(handle, code, value)) {
          return 0u;
        }
        lastError = Marshal.GetLastWin32Error();
        Thread.Sleep(RetryDelayMilliseconds);
      }
      throw new Win32Exception(lastError);
    });
  }

  static T WithTargetMonitor<T>(string monitorPattern, Func<IntPtr, T> operation) {
    var monitors = ListPhysicalMonitors();
    try {
      return operation(SelectTargetMonitor(monitors, monitorPattern).hPhysicalMonitor);
    } finally {
      foreach (var monitor in monitors) {
        DestroyPhysicalMonitor(monitor.hPhysicalMonitor);
      }
    }
  }

  static PHYSICAL_MONITOR SelectTargetMonitor(List<PHYSICAL_MONITOR> monitors, string monitorPattern) {
    var matching = monitors.FindAll(monitor => Regex.IsMatch(monitor.szPhysicalMonitorDescription ?? "", monitorPattern, RegexOptions.IgnoreCase));
    if (matching.Count > 0) {
      return matching[0];
    }
    if (monitors.Count == 1) {
      return monitors[0];
    }
    throw new InvalidOperationException(string.Format("No monitor description matches '{0}' among {1} DDC/CI monitors.", monitorPattern, monitors.Count));
  }

  static List<PHYSICAL_MONITOR> ListPhysicalMonitors() {
    var monitors = new List<PHYSICAL_MONITOR>();
    EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, (IntPtr hMonitor, IntPtr hdc, ref RECT rect, IntPtr data) => {
      uint count;
      if (!GetNumberOfPhysicalMonitorsFromHMONITOR(hMonitor, out count) || count == 0) {
        return true;
      }
      var physical = new PHYSICAL_MONITOR[count];
      if (GetPhysicalMonitorsFromHMONITOR(hMonitor, count, physical)) {
        monitors.AddRange(physical);
      }
      return true;
    }, IntPtr.Zero);
    return monitors;
  }
}
'@

function Invoke-HostCommand([string]$Line) {
  $parts = @($Line.Trim() -split '\s+')
  switch ($parts[0]) {
    'read' {
      $reading = [MonitorDdc]::ReadVcp($MonitorPattern, [byte]$parts[1])
      return "ok $($reading[0]) $($reading[1])"
    }
    'write' {
      [MonitorDdc]::WriteVcp($MonitorPattern, [byte]$parts[1], [uint32]$parts[2])
      return 'ok'
    }
    default { return "error unknown command '$($parts[0])'" }
  }
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  try {
    $response = Invoke-HostCommand $line
  } catch {
    $response = "error $($_.Exception.GetBaseException().Message -replace '\s+', ' ')"
  }
  [Console]::Out.WriteLine($response)
  [Console]::Out.Flush()
}
