const { app, Tray, Menu, MenuItem, Notification, shell, dialog, nativeTheme } = require('electron');
const Store = require('electron-store');
const { execSync } = require('child_process');
const package = require('./package.json');

const GITHUB_URL = 'https://github.com/narikei/Charger-Information-for-Mac';

const ICON_BLACK_PATH = `${__dirname}/images/icon_black.png`;
const ICON_GRAY_PATH = `${__dirname}/images/icon_gray.png`;
const ICON_WHITE_PATH = `${__dirname}/images/icon_white.png`;

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
let menuStatus;
let menuPower;
let menuVoltage;
let menuCurrent;
let menuChangeNotification;
let menuShowPower;
let menuOpenGithub;
let chargerInfo;


const initMenu = () => {
  appIcon = new Tray(ICON_BLACK_PATH);

  menuStatus = new MenuItem({
    enabled: false,
  });
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
      update(true);
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

  menu.append(menuStatus);
  menu.append(menuPower);
  menu.append(menuVoltage);
  menu.append(menuCurrent);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(menuChangeNotification);
  menu.append(menuShowPower);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(menuOpenGithub);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({ role: 'quit', label: 'Quit Charger Information v' + package.version }));

  appIcon.setContextMenu(menu);
};

let isFallback = false;
const getChargerInfo = () => {
  let v;
  const info = {};

  if(! isFallback){
    try{
      const stdout = execSync('ioreg -rn AppleSmartBattery | grep \\\"AdapterDetails\\\"');

      v = stdout.toString().match(/\{.+\}/);
      if (!v) {
        return info;
      }

      const res = v[0];

      v = res.match(/\"Watts\"=(\d+)/);
      if (v) {
        info.Watts = v[1];
      }

      v = res.match(/\"Voltage\"=(\d+)/);
      if (v) {
        info.Voltage = v[1];
      }

      v = res.match(/\"Current\"=(\d+)/);
      if (v) {
        info.Current = v[1];
      }
    }catch(e){
      console.log(e.toString());
      isFallback = true;
    }
  }
  if(isFallback){
    // Command Fallback
    try{
      const stdout = execSync('pmset -g ac');
      v = stdout.toString();
      if (!v) {
        return info;
      }

      const res = v;

      v = res.match(/Wattage = (\d+)/);
      if (v) {
        info.Watts = v[1];
      }

      v = res.match(/Voltage = (\d+)/);
      if (v) {
        info.Voltage = v[1];
      }

      v = res.match(/Current = (\d+)/);
      if (v) {
        info.Current = v[1];
      }

    }catch(e){
      app.dock.show();
      dialog.showErrorBox("Error : " + app.name, e.toString());
      app.quit();
    }
  }

  return info;
};

const isCharging = () => {
  return !!(chargerInfo.Watts && chargerInfo.Voltage && chargerInfo.Current);
}


const updateAppIcon = () => {
  let charging_path = ICON_BLACK_PATH;

  if (nativeTheme.shouldUseDarkColors) {
    charging_path = ICON_WHITE_PATH;
  }

  appIcon.setPressedImage(ICON_WHITE_PATH);

  if (!isCharging()) {
    appIcon.setImage(ICON_GRAY_PATH);
    return;
  }

  appIcon.setImage(charging_path);
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
    menuStatus.label = 'Missed charger.';
    menuPower.visible = false;
    menuVoltage.visible = false;
    menuCurrent.visible = false;
    return;
  }

  menuPower.visible = true;
  menuVoltage.visible = true;
  menuCurrent.visible = true;

  menuStatus.label = '⚡Charging';
  menuPower.label = `\tPower: ${chargerInfo.Watts}W`;
  menuVoltage.label = `\tVoltage: ${chargerInfo.Voltage / 1000}V`;
  menuCurrent.label = `\tCurrent: ${chargerInfo.Current / 1000}A`;
};

const notify = () => {
  if (!menuChangeNotification.checked) {
    return;
  }

  const params = {
    title: 'Missed charger.',
    silent: true,
  };

  if (isCharging()) {
    params.title = '⚡Charging';
    params.body = `Power: ${chargerInfo.Watts}W\nVoltage: ${chargerInfo.Voltage/1000}V / Current: ${chargerInfo.Current/1000}A`;
  }

  const notification = new Notification(params);
  notification.show();
};

const update = (forceUpdate = false) => {
  const oldChargerInfo = chargerInfo;
  chargerInfo = getChargerInfo();

  if (
    !forceUpdate &&
    oldChargerInfo
    && oldChargerInfo.Watts == chargerInfo.Watts
    && oldChargerInfo.Voltage == chargerInfo.Voltage
    && oldChargerInfo.Current == chargerInfo.Current
  ) {
    return;
  }

  updateAppIcon();
  updateAppIconTitle();
  updateMenuInfo();
  notify();

  updateMenu();
};


app.on('ready', () => {
  app.dock.hide();
  initMenu();

  update(true);
  setInterval(update, 5000);
});
