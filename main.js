const { app, Tray, Menu, MenuItem } = require('electron');
const { execSync } = require('child_process');


const ICON_PATH = `${__dirname}/images/icon.png`;


let appIcon;
let menu
let menuWatts;
let menuVoltage;
let menuCurrent;


const initMenu = () => {
  appIcon = new Tray(ICON_PATH);

  menuWatts = new MenuItem({
    enabled: false,
  });
  menuVoltage = new MenuItem({
    enabled: false,
  });
  menuCurrent = new MenuItem({
    enabled: false,
  });
};

const updateMenu = () => {
  menu = new Menu();

  menu.append(menuWatts);
  menu.append(menuVoltage);
  menu.append(menuCurrent);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({ role: 'quit' }));

  appIcon.setContextMenu(menu);
};


const getChargerInfo = () => {
  const stdout = execSync('ioreg -rn AppleSmartBattery | grep \\\"AdapterDetails\\\"');
  const res = stdout.toString().match(/\{.+\}/)[0];
  const info = JSON.parse(res.replace(/=/g, ':'));
  return info;
};


const update = () => {
  const chargerInfo = getChargerInfo();

  appIcon.setTitle(`${chargerInfo.Watts}W`);

  menuWatts.label = `Watts: ${chargerInfo.Watts}W`;
  menuVoltage.label = `Voltage: ${chargerInfo.Voltage / 1000}V`;
  menuCurrent.label = `Current: ${chargerInfo.Current / 1000}A`;

  updateMenu();
};


app.on('ready', () => {
  app.dock.hide();
  initMenu();

  update();
  setInterval(update, 5000);
});
