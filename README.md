# Stream Deck: DDC Monitor Control

A Stream Deck plugin for Windows that switches a monitor's input source and adjusts brightness, contrast and color gains over DDC/CI.

## Tested monitors

| Monitor | Model code | Status |
| --- | --- | --- |
| Samsung Odyssey OLED G9 (49\") | G93SC | Tested |

No other monitor has been tested. Samsung sells several monitors under the Odyssey G9 name (for example G95SC, G95NC, G97NB and the original C49G95T), and none of them have been tested with this plugin. DDC/CI support and input source values differ between models and firmware versions.

## Install

Requires Windows 10 or later and Stream Deck 7.1 or later. In PowerShell:

```powershell
git clone https://github.com/olebru/streamdeck-ddc-monitor-control.git
cd streamdeck-ddc-monitor-control
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

`install.ps1` downloads the `.streamDeckPlugin` file from the latest GitHub release and opens it in Stream Deck. To install a local build instead, pass `-PluginFile .\dist\com.olebru.ddc-monitor-control.streamDeckPlugin`.

Then drag **DDC Monitor Control → Toggle input** onto a key and choose the two inputs in the property inspector.

## Actions

### Toggle input

Switches between input A and input B, selected in the property inspector from DisplayPort 1 (`15`), DisplayPort 2 (`16`), HDMI 1 (`17`), HDMI 2 (`18`), USB-C (`27`), HDMI 1 on the G93SC (`5`), or another VCP `0x60` value. The defaults are DisplayPort 1 and HDMI 1 on the G93SC.

- The key reads the current input source when it appears and shows input A or input B, titled with the input name.
- A key press reads the input source again and writes input A if the monitor is on input B, otherwise input B.
- Each state has its own image, and the image and title can be replaced in Stream Deck like any other two-state key.

The G93SC switches to HDMI 1 with value `5`, which is not in the input list it reports over DDC/CI (`1 3 4 15 16 17 18`). The standard MCCS value for HDMI 1 (`17`) has no effect on this model. Only DisplayPort 1 (`15`) and HDMI 1 (`5`) were confirmed on a G93SC.

### Monitor setting

Controls one of brightness (`0x10`), contrast (`0x12`) or red, green or blue gain (`0x16`, `0x18`, `0x1A`), selected in the property inspector. Value and step are percentages of the range the monitor reports for the setting: brightness and contrast are `0–50` on the G93SC, the gains `0–100`.

- On a key, a press either sets the configured value or changes the current value by the configured step (negative steps lower it). A non-zero step always moves the value by at least one unit.
- On a Stream Deck+ dial, rotation changes the value by the step per tick, and a push or touch sets the configured value. The touch strip shows the setting, its percentage and a level bar. Writes during fast rotation are coalesced so only the latest value is sent.

Brightness, contrast and red gain changes were confirmed on a G93SC. Green and blue gain were not tested. Writing the color preset code (`0x14`) has no effect on the G93SC, and the volume and mute codes were not verified, so they are not exposed.

### Errors

A failed DDC/CI call shows the Stream Deck alert icon and writes the error to the plugin log in `%APPDATA%\Elgato\StreamDeck\Plugins\com.olebru.ddc-monitor-control.sdPlugin\logs`.

## How it works

The plugin runs `scripts/ddc-host.ps1` in a long-lived `powershell.exe` process. It compiles the `dxva2.dll` bindings once, then handles `read <code>` and `write <code> <value>` requests on stdin. The monitor is selected by a description matching `G93SC|Odyssey`, or as the only DDC/CI monitor when none matches.

## Build

```sh
npm install
npm test
npm run pack
```

`npm run pack` writes `dist/com.olebru.ddc-monitor-control.streamDeckPlugin`.

## License

[MIT](LICENSE)
