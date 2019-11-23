const { app, Tray, Menu, MenuItem } = require('electron');
const { execSync } = require('child_process');


const ICON_PATH = `${__dirname}/images/icon.png`;


let appIcon;
let menu


const initMenu = () => {
  appIcon = new Tray(ICON_PATH);
};

const updateMenu = () => {
  menu = new Menu();

  menu.append(new MenuItem({ role: 'quit' }));

  appIcon.setContextMenu(menu);
};


const getChargerInfo = () => {
  const stdout = execSync('ioreg -rn AppleSmartBattery | grep \\\"AdapterDetails\\\"');
  const res = stdout.toString().match(/\{.+\}/)[0];
  const info = JSON.parse(res.replace(/=/g, ':'));
  return info;
};


app.on('ready', () => {
  app.dock.hide();
  initMenu();

  const chargerInfo = getChargerInfo();
  appIcon.setTitle(`${chargerInfo.Watts}W`);

  updateMenu();
});
