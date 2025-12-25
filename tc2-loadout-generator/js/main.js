import { classPortraits, weapons } from './data.js';

let selectedClass = null;

const button = document.getElementById('generate');

document.querySelectorAll('.class-icon').forEach(icon => {
  icon.addEventListener('click', () => {
    document.querySelectorAll('.class-icon').forEach(icon => icon.classList.remove('selected'));
    icon.classList.add('selected');
    selectedClass = icon.id;
  });
});

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

function sanitizeName(name) {
    return name
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

class ImagePreloader {
  constructor() {
    this.loaded = 0;
    this.total = 0;
    this.cache = new Map();
  }

  async preloadImages(urls) {
    this.total = urls.size;
    const loadingOverlay = this.createLoadingOverlay();
    document.body.appendChild(loadingOverlay);

    try {
      const promises = Array.from(urls).map(url => this.preloadImage(url));
      await Promise.allSettled(promises);
    } finally {
      if (document.body.contains(loadingOverlay)) {
          loadingOverlay.remove();
      }
    }
  }

  preloadImage(url) {
    if (this.cache.has(url)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(url, img);
        this.loaded++;
        this.updateLoadingProgress();
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${url}`);
        this.loaded++;
        this.updateLoadingProgress();
        reject();
      };
      img.src = url;
    });
  }

  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div id="loading-progress">Loading assets... (0%)</div>
      </div>`;
    return overlay;
  }

  updateLoadingProgress() {
    const progress = document.getElementById('loading-progress');
    if (progress) {
      const percentage = this.total > 0 ? Math.round((this.loaded / this.total) * 100) : 100;
      progress.textContent = `Loading assets... (${percentage}%)`;
    }
  }
}

function generateLoadout(currentClass) {
  const loadoutContainer = document.getElementById('loadout');
  const itemContainers = document.querySelectorAll('.item-container');
  const classPortrait = document.getElementById('classPortrait');
  
  const previousClass = classPortrait.dataset.currentClass;
  classPortrait.dataset.currentClass = currentClass;

  const animateElements = () => {
    itemContainers.forEach(container => container.classList.add('changing'));
    if (previousClass !== currentClass) classPortrait.classList.add('changing');
  };

  const updateLoadout = () => {
    document.getElementById('className').textContent = `Your loadout for ${currentClass} is..`;
    classPortrait.src = classPortraits[currentClass];

    const setWeapon = (slotType, weaponList) => {
        const container = document.getElementById(`${slotType.toLowerCase()}Weapon`);
        const weaponName = weaponList[Math.floor(Math.random() * weaponList.length)];
        const weaponImage = `images/weapons/${sanitizeName(currentClass)}/${sanitizeName(weaponName)}.png`;
        
        container.querySelector('img').src = weaponImage;
        container.querySelector('p').textContent = weaponName;
    };

    setWeapon('primary', weapons[currentClass]['Primary']);
    setWeapon('secondary', weapons[currentClass]['Secondary']);
    setWeapon('melee', weapons[currentClass]['Melee']);

    const pdaContainer = document.getElementById('pda');
    if (currentClass === "Agent" && weapons[currentClass]["PDA"]) {
      pdaContainer.style.display = 'block';
      const pdaName = weapons[currentClass]["PDA"][Math.floor(Math.random() * weapons[currentClass]["PDA"].length)];
      const pdaImage = `images/weapons/agent/${sanitizeName(pdaName)}.png`;
      pdaContainer.querySelector('img').src = pdaImage;
      pdaContainer.querySelector('p').textContent = pdaName;
    } else {
      pdaContainer.style.display = 'none';
    }
  };

  animateElements();
  loadoutContainer.style.display = 'block';
  setTimeout(() => {
    loadoutContainer.classList.add('show');
    updateLoadout();
    setTimeout(() => {
      itemContainers.forEach(container => container.classList.remove('changing'));
      if (previousClass !== currentClass) classPortrait.classList.remove('changing');
    }, 50);
  }, 300);
}

document.addEventListener("DOMContentLoaded", async function () {
  const preloader = new ImagePreloader();
  const imagesToPreload = new Set();

  const backgrounds = [
    "3cp_citrus",
    "ad_cliffhanger",
    "ad_deadfall_ridge",
    "ad_gorge",
    "ad_yellowvalley",
    "ctf_doublefort",
    "koth_bagel",
    "koth_harvest",
    "tr_target"
  ];
  const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  const bgPath = `images/backgrounds/${randomBg}.png`;
  document.body.style.backgroundImage = `url('${bgPath}')`;
  imagesToPreload.add(bgPath);

  // Preload all existing images
  document.querySelectorAll('img').forEach(img => {
    if (img.src) imagesToPreload.add(img.src);
  });
  document.querySelectorAll('*').forEach(element => {
    const bgImg = window.getComputedStyle(element).backgroundImage;
    if (bgImg.startsWith('url')) {
      const url = bgImg.match(/url\\(['"]?(.*?)['"]?\\)/)?.[1];
      if (url) imagesToPreload.add(url);
    }
  });

  for (const className in weapons) {
      const saneClassName = sanitizeName(className);
      for (const weaponType in weapons[className]) {
          weapons[className][weaponType].forEach(weaponName => {
              const localPath = `images/weapons/${saneClassName}/${sanitizeName(weaponName)}.png`;
              imagesToPreload.add(localPath);
          });
      }
  }
  Object.values(classPortraits).forEach(portraitUrl => imagesToPreload.add(portraitUrl));

  await preloader.preloadImages(imagesToPreload);

  const throttledGenerate = throttle(() => {
    let currentClass = selectedClass;
    if (!currentClass) {
        alert("Please select a class first!");
        return;
    }
    if (currentClass === "Random") {
      const classKeys = Object.keys(classPortraits);
      currentClass = classKeys[Math.floor(Math.random() * classKeys.length)];
    }
    generateLoadout(currentClass);
    document.getElementById('loadout').scrollIntoView({ behavior: 'smooth' });
  }, 500);

  button.addEventListener('click', throttledGenerate);
  
  function handleArrowKeys(e) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) return;
    
    const icons = Array.from(document.querySelectorAll('.class-icon'));
    const selectedIcon = document.querySelector('.class-icon.selected');
    let currentIndex = selectedIcon ? icons.indexOf(selectedIcon) : -1;
    
    let newIndex = 0;
    const gridWidth = 5;
    const numIcons = icons.length;
    
    if(currentIndex === -1) {
      newIndex = 0;
    } else {
      switch(e.code) {
        case 'ArrowLeft':
          newIndex = currentIndex > 0 ? currentIndex - 1 : numIcons - 1;
          break;
        case 'ArrowRight':
          newIndex = currentIndex < numIcons - 1 ? currentIndex + 1 : 0;
          break;
        case 'ArrowUp':
          newIndex = currentIndex < gridWidth ? (numIcons + currentIndex - gridWidth) % numIcons : currentIndex - gridWidth;
          break;
        case 'ArrowDown':
          newIndex = (currentIndex + gridWidth) % numIcons;
          break;
      }
    }
    
    icons.forEach(icon => icon.classList.remove('selected'));
    icons[newIndex].classList.add('selected');
    selectedClass = icons[newIndex].id;
    
    e.preventDefault();
  }

  document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      handleArrowKeys(e);
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      throttledGenerate();
    }
  });
});
