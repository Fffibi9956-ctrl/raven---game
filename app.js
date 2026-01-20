  // ========== НАСТРОЙКИ И ПЕРЕМЕННЫЕ ==========
let scene, camera, renderer, ravenModel, flightPath;
let progress = 0;
const flightSpeed = 0.0005; // Скорость полёта ворона
let isCarryingFragment = true;
let mapFragment, fragmentDropped = false;

// ========== ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ==========
function init() {
    // 1. Создаём сцену и задаём фон (небо)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // 2. Создаём камеру (поле зрения 75°, соотношение сторон экрана, ближняя и дальняя плоскости отсечения)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 15); // Позиция камеры: x=0, y=2, z=15

    // 3. Создаём WebGL рендерер и добавляем его на страницу
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 4. Добавляем освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Рассеянный свет
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Направленный свет
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // 5. Создаём траекторию полёта
    createFlightPath();
    // 6. Загружаем модель ворона (ССЫЛКА УКАЗАНА ДЛЯ ВАШЕГО РЕПОЗИТОРИЯ)
    loadRavenModel();
    // 7. Создаём фрагмент карты
    createMapFragment();

    // 8. Запускаем анимационный цикл
    animate();
    // 9. Обработчик изменения размера окна
    window.addEventListener('resize', onWindowResize);
}

// ========== СОЗДАНИЕ ТРАЕКТОРИИ ПОЛЁТА (КРИВОЙ) ==========
function createFlightPath() {
    // Массив точек, через которые пролетит ворон
    const curvePoints = [
        new THREE.Vector3(-20, 5, -5),   // Начало: слева, вверху, немного назад
        new THREE.Vector3(-10, 4, -2),   // Приближение к центру
        new THREE.Vector3(0, 3, 0),      // Центр сцены (здесь будет сброс)
        new THREE.Vector3(10, 5, 3),     // Удаление вправо
        new THREE.Vector3(20, 6, 5)      // Конец: справа, вверху, впереди
    ];
    // Создаём плавную кривую через эти точки
    flightPath = new THREE.CatmullRomCurve3(curvePoints);

    // (ОТЛАДКА) Визуализация пути - красная линия в сцене
    const points = flightPath.getPoints(50); // 50 сегментов линии
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const pathLine = new THREE.Line(geometry, material);
    scene.add(pathLine);
}

// ========== ЗАГРУЗКА МОДЕЛИ ВОРОНА ==========
function loadRavenModel() {
    const loader = new THREE.GLTFLoader();
    
    // 🔴 ВАЖНО: Прямая ссылка на ваш файл raven.glb в репозитории
    // Формат: https://github.com/ЛОГИН/РЕПОЗИТОРИЙ/raw/main/ФАЙЛ
    const modelUrl = 'https://github.com/Fffibi9956-c/raven---game/raw/main/raven.glb';
    
    loader.load(
        modelUrl,
        // Функция при успешной загрузке
        function(gltf) {
            ravenModel = gltf.scene;
            // Настраиваем размер модели (можете изменить при необходимости)
            ravenModel.scale.set(0.8, 0.8, 0.8);
            // Поворачиваем модель, если она изначально ориентирована неправильно
            ravenModel.rotation.y = Math.PI;
            scene.add(ravenModel);
            console.log('✅ Модель ворона успешно загружена!');
            document.getElementById('info').textContent = 'Ворон загружен! Управление: нет (автополёт)';
        },
        // Функция прогресса загрузки (опционально)
        function(xhr) {
            console.log('Загружено: ' + (xhr.loaded / xhr.total * 100) + '%');
        },
        // Функция при ошибке загрузки
        function(error) {
            console.error('❌ Ошибка загрузки модели:', error);
            document.getElementById('info').textContent = 'Ошибка загрузки модели. Используется куб для отладки.';
            // Создаём простой куб вместо модели для отладки
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
            ravenModel = new THREE.Mesh(geometry, material);
            scene.add(ravenModel);
        }
    );
}

// ========== СОЗДАНИЕ ФРАГМЕНТА КАРТЫ ==========
function createMapFragment() {
    // Создаём плоский прямоугольник, похожий на фрагмент карты
    const geometry = new THREE.BoxGeometry(1.2, 0.05, 1.2);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffd700, // Золотистый цвет
        transparent: true,
        opacity: 0.9
    });
    mapFragment = new THREE.Mesh(geometry, material);
    // Пока фрагмент невидим, пока его не "возьмёт" ворон
    mapFragment.visible = false;
    scene.add(mapFragment);
}

// ========== ГЛАВНЫЙ ЦИКЛ АНИМАЦИИ ==========
function animate() {
    requestAnimationFrame(animate);
    
    // Если модель ворона загружена и полёт не завершён
    if (ravenModel && progress < 1) {
        // 1. Увеличиваем прогресс движения вдоль траектории
        progress += flightSpeed;
        
        // 2. Получаем текущую позицию на кривой и устанавливаем её для модели
        const currentPosition = flightPath.getPoint(progress);
        ravenModel.position.copy(currentPosition);
        
        // 3. Заставляем ворона смотреть вперёд по траектории
        //    Берём точку чуть впереди текущей позиции
        const lookAheadPoint = flightPath.getPoint(Math.min(progress + 0.01, 1));
        ravenModel.lookAt(lookAheadPoint);
        
        // 4. Добавляем лёгкое покачивание для эффекта парения
        ravenModel.rotation.z = Math.sin(Date.now() * 0.001) * 0.05;
        
        // 5. Если ворон "несёт" фрагмент, перемещаем фрагмент вместе с ним
        if (isCarryingFragment && mapFragment) {
            mapFragment.visible = true;
            // Позиция фрагмента относительно модели ворона (имитация когтя)
            const clawPosition = new THREE.Vector3(0.4, -0.6, 0.4);
            // Преобразуем локальную позицию в мировую
            ravenModel.localToWorld(clawPosition);
            mapFragment.position.copy(clawPosition);
            // Фрагмент повторяет вращение ворона
            mapFragment.rotation.copy(ravenModel.rotation);
        }
        
        // 6. Автоматический сброс фрагмента, когда ворон достигает середины пути
        if (progress > 0.5 && progress < 0.51 && !fragmentDropped) {
            dropFragment();
            fragmentDropped = true;
        }
    }
    
    // Рендерим сцену с текущей камеры
    renderer.render(scene, camera);
}

// ========== ФУНКЦИЯ СБРОСА ФРАГМЕНТА КАРТЫ ==========
function dropFragment() {
    if (!mapFragment) return;
    
    isCarryingFragment = false;
    document.getElementById('info').textContent = 'Ворон сбросил фрагмент карты!';
    console.log('🗺️ Фрагмент карты сброшен!');
    
    // Простая анимация падения фрагмента
    let fallSpeed = 0.05;
    let rotationSpeed = 0.03;
    
    function animateFall() {
        // Фрагмент падает вниз
        mapFragment.position.y -= fallSpeed;
        // И вращается при падении
        mapFragment.rotation.x += rotationSpeed;
        mapFragment.rotation.z += rotationSpeed * 0.7;
        
        // Немного замедляем падение для эффекта
        fallSpeed *= 0.995;
        
        // Продолжаем анимацию, пока фрагмент не упадёт достаточно низко
        if (mapFragment.position.y > -10) {
            requestAnimationFrame(animateFall);
        }
    }
    
    animateFall();
}

// ========== ОБРАБОТКА ИЗМЕНЕНИЯ РАЗМЕРА ОКНА ==========
function onWindowResize() {
    // Обновляем соотношение сторон камеры
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // Обновляем размер рендерера
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ========== ЗАПУСК ПРИЛОЖЕНИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ==========
// Ждём полной загрузки DOM, затем инициализируем наше приложение
document.addEventListener('DOMContentLoaded', init); 
