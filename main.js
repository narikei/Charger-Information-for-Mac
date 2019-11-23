const { app, Tray, Menu, MenuItem } = require('electron');
const Store = require('electron-store');
const { execSync } = require('child_process');


const ICON_CHARGING_PATH = `${__dirname}/images/icon_charging.png`;
const ICON_MISSED_PATH = `${__dirname}/images/icon_missed.png`;
const ICON_PRESSED_PATH = `${__dirname}/images/icon_pressed.png`;
const MENU_SHOW_WATTS_KEY = `MENU_SHOW_WATTS_KEY`;


const store = new Store({
  schema: {
    MENU_SHOW_WATTS_KEY: {
      type: 'boolean',
      default: true,
    },
  },
});


let appIcon;
let menu
let menuWatts;
let menuVoltage;
let menuCurrent;
let menuShowWatts;
let chargerInfo;


const initMenu = () => {
  appIcon = new Tray(ICON_CHARGING_PATH);
  appIcon.setPressedImage(ICON_PRESSED_PATH);

  menuWatts = new MenuItem({
    enabled: false,
  });
  menuVoltage = new MenuItem({
    enabled: false,
  });
  menuCurrent = new MenuItem({
    enabled: false,
  });
  menuShowWatts = new MenuItem({
    label: 'Show Watts',
    type: 'checkbox',
    checked: store.get(MENU_SHOW_WATTS_KEY),
    click: () => {
      update();
      store.set(MENU_SHOW_WATTS_KEY, menuShowWatts.checked);
    },
  });
};

const updateMenu = () => {
  menu = new Menu();

  menu.append(menuWatts);
  menu.append(menuVoltage);
  menu.append(menuCurrent);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(menuShowWatts);
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

const isCharging = () => {
  return !!(chargerInfo.Watts && chargerInfo.Voltage && chargerInfo.Current);
}


const updateAppIcon = () => {
  if (!isCharging()) {
    appIcon.setImage(ICON_MISSED_PATH);
    return;
  }

  appIcon.setImage(ICON_CHARGING_PATH);
};

const updateAppIconTitle = () => {
  let title = '';

  if (menuShowWatts.checked && isCharging()) {
    title = `${chargerInfo.Watts}W`;
  }

  appIcon.setTitle(title);
};

const updateMenuInfo = () => {
  if (!isCharging()) {
    menuWatts.visible = false;
    menuVoltage.visible = false;
    menuCurrent.visible = false;
    return;
  }

  menuWatts.visible = true;
  menuVoltage.visible = true;
  menuCurrent.visible = true;

  menuWatts.label = `Watts: ${chargerInfo.Watts}W`;
  menuVoltage.label = `Voltage: ${chargerInfo.Voltage / 1000}V`;
  menuCurrent.label = `Current: ${chargerInfo.Current / 1000}A`;
};


const update = () => {
  chargerInfo = getChargerInfo();

  updateAppIcon();
  updateAppIconTitle();
  updateMenuInfo();

  updateMenu();
};


app.on('ready', () => {
  app.dock.hide();
  initMenu();

  update();
  setInterval(update, 5000);
});
