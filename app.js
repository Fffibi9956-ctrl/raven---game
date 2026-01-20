// ========== НАСТРОЙКИ ==========
let scene, camera, renderer, ravenModel, flightPath;
let progress = 0;
const flightSpeed = 0.0007;
let isCarryingFragment = true;
let mapFragment, fragmentDropped = false;

// ========== ЗАГРУЗКА ==========
function init() {
    // 1. Создаём сцену
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // 2. Создаём камеру
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 10);

    // 3. Создаём рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 4. Добавляем свет
    const light = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(light);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 5. Создаём траекторию
    createFlightPath();
    // 6. Загружаем модель ворона (ССЫЛКУ ЗАМЕНИТЕ!)
    loadModel();
    // 7. Создаём фрагмент карты
    createMapFragment();

    // 8. Запускаем анимацию
    animate();
    window.addEventListener('resize', onWindowResize);
}

// ========== ТРАЕКТОРИЯ ==========
function createFlightPath() {
    const points = [
        new THREE.Vector3(-15, 5, 0),
        new THREE.Vector3(-5, 4, -2),
        new THREE.Vector3(0, 3, 0),
        new THREE.Vector3(5, 5, 2),
        new THREE.Vector3(15, 6, 0)
    ];
    flightPath = new THREE.CatmullRomCurve3(points);
}

// ========== ЗАГРУЗКА МОДЕЛИ ==========
function loadModel() {
    const loader = new THREE.GLTFLoader();
    // 🔴 ВАЖНО: Замените эту ссылку на прямую ссылку на ваш .glb файл!
    const modelUrl = 'https://raw.githubusercontent.com/ВАШ_ЛОГИН/ВАШ_РЕПОЗИТОРИЙ/main/models/raven.glb';
    
    loader.load(modelUrl,
        (gltf) => {
            ravenModel = gltf.scene;
            ravenModel.scale.set(0.5, 0.5, 0.5);
            scene.add(ravenModel);
            document.getElementById('info').textContent = 'Ворон загружен!';
        },
        undefined,
        (error) => {
            console.error('Ошибка загрузки модели:', error);
            // Создаём куб для отладки
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            ravenModel = new THREE.Mesh(geo, mat);
            scene.add(ravenModel);
            document.getElementById('info').textContent = 'Загружен куб вместо модели';
        }
    );
}

// ========== СОЗДАНИЕ ФРАГМЕНТА КАРТЫ ==========
function createMapFragment() {
    const geometry = new THREE.BoxGeometry(1, 0.1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    mapFragment = new THREE.Mesh(geometry, material);
    mapFragment.visible = false;
    scene.add(mapFragment);
}

// ========== АНИМАЦИЯ ==========
function animate() {
    requestAnimationFrame(animate);
    
    if (ravenModel && progress < 1) {
        // Движение
        progress += flightSpeed;
        const pos = flightPath.getPoint(progress);
        ravenModel.position.copy(pos);
        
        // Поворот
        const lookAtPoint = flightPath.getPoint(Math.min(progress + 0.01, 1));
        ravenModel.lookAt(lookAtPoint);
        
        // Парение
        ravenModel.rotation.z = Math.sin(Date.now() * 0.002) * 0.05;
        
        // Если несём фрагмент
        if (isCarryingFragment && mapFragment) {
            mapFragment.visible = true;
            const clawPos = new THREE.Vector3(0.3, -0.5, 0.3);
            ravenModel.localToWorld(clawPos);
            mapFragment.position.copy(clawPos);
            mapFragment.rotation.copy(ravenModel.rotation);
        }
        
        // Сброс фрагмента на середине пути
        if (progress > 0.5 && !fragmentDropped) {
            dropFragment();
            fragmentDropped = true;
        }
    }
    
    renderer.render(scene, camera);
}

// ========== СБРОС ФРАГМЕНТА ==========
function dropFragment() {
    if (!mapFragment) return;
    isCarryingFragment = false;
    document.getElementById('info').textContent = 'Фрагмент сброшен!';
    
    // Простая анимация падения
    function fall() {
        mapFragment.position.y -= 0.03;
        mapFragment.rotation.x += 0.03;
        mapFragment.rotation.z += 0.02;
        if (mapFragment.position.y > -5) {
            requestAnimationFrame(fall);
        }
    }
    fall();
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ========== ЗАПУСК ==========
init();