const { app, Tray, Menu, MenuItem, Notification, shell } = require('electron');
const Store = require('electron-store');
const { execSync } = require('child_process');

const GITHUB_URL = 'https://github.com/narikei/Charger-Information-for-Mac';

const ICON_CHARGING_PATH = `${__dirname}/images/icon_charging.png`;
const ICON_MISSED_PATH = `${__dirname}/images/icon_missed.png`;
const ICON_PRESSED_PATH = `${__dirname}/images/icon_pressed.png`;

const MENU_NOTIFICATION_KEY = `MENU_NOTIFICATION_KEY`;
const MENU_SHOW_POWER_KEY = `MENU_SHOW_POWER_KEY`;


const store = new Store({
  schema: {
    MENU_NOTIFICATION_KEY: {
      type: 'boolean',
      default: false,
    },
    MENU_SHOW_POWER_KEY: {
      type: 'boolean',
      default: true,
    },
  },
});


let appIcon;
let menu
let menuPower;
let menuVoltage;
let menuCurrent;
let menuChangeNotification;
let menuShowPower;
let menuOpenGithub;
let chargerInfo;


const initMenu = () => {
  appIcon = new Tray(ICON_CHARGING_PATH);
  appIcon.setPressedImage(ICON_PRESSED_PATH);

  menuPower = new MenuItem({
    enabled: false,
  });
  menuVoltage = new MenuItem({
    enabled: false,
  });
  menuCurrent = new MenuItem({
    enabled: false,
  });
  menuChangeNotification = new MenuItem({
    label: 'Change Notification',
    type: 'checkbox',
    checked: store.get(MENU_NOTIFICATION_KEY),
    click: () => {
      store.set(MENU_NOTIFICATION_KEY, menuChangeNotification.checked);
    },
  });
  menuShowPower = new MenuItem({
    label: 'Show Power',
    type: 'checkbox',
    checked: store.get(MENU_SHOW_POWER_KEY),
    click: () => {
      update();
      store.set(MENU_SHOW_POWER_KEY, menuShowPower.checked);
    },
  });
  menuOpenGithub = new MenuItem({
    label: 'Open GitHub',
    click: () => {
      shell.openExternal(GITHUB_URL);
    },
  });
};

const updateMenu = () => {
  menu = new Menu();

  menu.append(menuPower);
  menu.append(menuVoltage);
  menu.append(menuCurrent);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(menuChangeNotification);
  menu.append(menuShowPower);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(menuOpenGithub);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({ role: 'quit', label: 'Quit Charger Information' }));

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

  if (menuShowPower.checked && isCharging()) {
    title = `${chargerInfo.Watts}W`;
  }

  appIcon.setTitle(title);
};

const updateMenuInfo = () => {
  if (!isCharging()) {
    menuPower.visible = false;
    menuVoltage.visible = false;
    menuCurrent.visible = false;
    return;
  }

  menuPower.visible = true;
  menuVoltage.visible = true;
  menuCurrent.visible = true;

  menuPower.label = `Power: ${chargerInfo.Watts}W`;
  menuVoltage.label = `Voltage: ${chargerInfo.Voltage / 1000}V`;
  menuCurrent.label = `Current: ${chargerInfo.Current / 1000}A`;
};

const notify = (oldChargerInfo) => {
  if (!menuChangeNotification.checked) {
    return;
  }

  if (
    oldChargerInfo
    && oldChargerInfo.Watts == chargerInfo.Watts
    && oldChargerInfo.Voltage == chargerInfo.Voltage
    && oldChargerInfo.Current == chargerInfo.Current
  ) {
    return;
  }

  const params = {
    title: 'Missed charger.',
    silent: true,
  };

  if (isCharging()) {
    params.title = 'Charging';
    params.body = `Power: ${chargerInfo.Watts}W\nVoltage: ${chargerInfo.Voltage/1000}V / Current: ${chargerInfo.Current/1000}A`;
  }

  const notification = new Notification(params);
  notification.show();
};

const update = () => {
  const oldChargerInfo = chargerInfo;
  chargerInfo = getChargerInfo();

  updateAppIcon();
  updateAppIconTitle();
  updateMenuInfo();
  notify(oldChargerInfo);

  updateMenu();
};


app.on('ready', () => {
  app.dock.hide();
  initMenu();

  update();
  setInterval(update, 5000);
});
