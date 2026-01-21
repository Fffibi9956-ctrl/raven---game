// ====== ОСНОВНЫЕ ПЕРЕМЕННЫЕ И НАСТРОЙКИ ======
console.log('=== ИГРА "ВОРОН С КАРТОЙ" ЗАПУЩЕНА ===');

let scene, camera, renderer, ravenModel, flightPath;
let progress = 0;
const flightSpeed = 0.0005;
let isCarryingFragment = true;
let mapFragment, fragmentDropped = false;

// ====== ФУНКЦИИ ДЛЯ РАБОТЫ С ИНТЕРФЕЙСОМ ======
function updateGameStatus(text, type = 'info') {
    const statusEl = document.getElementById('status-text');
    if (!statusEl) {
        console.error('Элемент status-text не найден в DOM!');
        return;
    }
    
    if (type === 'error') {
        statusEl.innerHTML = `<span class="error">❌ ${text}</span>`;
        const reloadBtn = document.getElementById('reload-btn');
        if (reloadBtn) reloadBtn.style.display = 'block';
    } else if (type === 'success') {
        statusEl.innerHTML = `<span class="success">✅ ${text}</span>`;
    } else if (type === 'loading') {
        statusEl.innerHTML = `<span class="loader"></span> ${text}`;
    } else {
        statusEl.innerHTML = text;
    }
}

// ====== ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ ======
function init() {
    console.log('1. Начинаю инициализацию игры...');
    updateGameStatus('Проверяю поддержку 3D...', 'loading');
    
    try {
        // Проверка поддержки WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('Ваш браузер или устройство не поддерживает 3D-графику (WebGL)');
        }
        
        // 1. СОЗДАЁМ СЦЕНУ
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); // Цвет неба
        console.log('2. Сцена создана');
        updateGameStatus('Создаю 3D-мир...', 'loading');
        
        // 2. НАСТРАИВАЕМ КАМЕРУ (СДВИНУТА ДАЛЬШЕ И ВЫШЕ ДЛЯ ЛУЧШЕГО ВИДА)
        camera = new THREE.PerspectiveCamera(
            75, // Угол обзора
            window.innerWidth / window.innerHeight, // Соотношение сторон
            0.1, // Ближняя плоскость отсечения
            1000 // Дальняя плоскость отсечения
        );
        camera.position.set(0, 8, 25); // УВЕЛИЧЕНО: y=8, z=25 (было y=2, z=15)
        console.log('3. Камера создана, позиция:', camera.position);
        
        // 3. СОЗДАЁМ РЕНДЕРЕР
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, // Сглаживание
            alpha: true,     // Прозрачный фон
            powerPreference: 'high-performance' // Приоритет производительности
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Ограничение для мобильных
        
        const container = document.getElementById('game-container');
        if (!container) {
            throw new Error('Контейнер game-container не найден на странице');
        }
        container.appendChild(renderer.domElement);
        console.log('4. Рендерер создан и добавлен на страницу');
        updateGameStatus('Настраиваю графику...', 'loading');
        
        // 4. ДОБАВЛЯЕМ ОСВЕЩЕНИЕ
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Рассеянный свет
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Направленный свет
        directionalLight.position.set(5, 15, 10); // УВЕЛИЧЕНО: y=15 (было y=10)
        scene.add(directionalLight);
        console.log('5. Освещение настроено');
        
        // 5. СОЗДАЁМ КОМПОНЕНТЫ ИГРЫ
        createFlightPath();   // Траектория полёта
        createMapFragment();  // Фрагмент карты
        loadRavenModel();     // Загрузка модели ворона
        
        // 6. ЗАПУСКАЕМ АНИМАЦИЮ
        animate();
        
        // 7. НАСТРАИВАЕМ ОБРАБОТЧИКИ СОБЫТИЙ
        window.addEventListener('resize', onWindowResize);
        
        console.log('✅ Инициализация игры завершена успешно!');
        
    } catch (error) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ИНИЦИАЛИЗАЦИИ:', error);
        updateGameStatus(`Ошибка запуска: ${error.message}`, 'error');
    }
}

// ====== СОЗДАНИЕ ТРАЕКТОРИИ ПОЛЁТА ======
function createFlightPath() {
    console.log('Создаю траекторию полёта ворона...');
    
    // Точки, через которые пролетит ворон (ПОДНЯТЫ ВЫШЕ)
    const curvePoints = [
        new THREE.Vector3(-25, 10, -8),   // Начало: дальше, выше
        new THREE.Vector3(-15, 8, -4),    // Приближение к центру
        new THREE.Vector3(0, 6, 0),       // Центр (здесь сбросит фрагмент) - ПОВЫШЕНО
        new THREE.Vector3(15, 9, 5),      // Удаление вправо
        new THREE.Vector3(25, 11, 8)      // Конец: дальше, выше
    ];
    
    // Создаём плавную кривую через эти точки
    flightPath = new THREE.CatmullRomCurve3(curvePoints);
    
    // (ОТЛАДКА) Визуализация пути в сцене
    const points = flightPath.getPoints(50); // 50 сегментов для гладкости
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const pathLine = new THREE.Line(geometry, material);
    scene.add(pathLine);
    
    console.log('Траектория создана');
}

// ====== ЗАГРУЗКА МОДЕЛИ ВОРОНА ======
function loadRavenModel() {
    console.log('Начинаю загрузку 3D-модели ворона...');
    updateGameStatus('Загружаю модель ворона...', 'loading');
    
    // 🔴 ВАЖНО: ПРАВИЛЬНЫЙ URL с тремя "f" в логине
    const modelUrl = 'https://cdn.jsdelivr.net/gh/Fffibi9956-ctrl/raven---game/raven.glb';
    
    console.log('Использую URL модели:', modelUrl);
    
    const loader = new THREE.GLTFLoader();
    
    loader.load(
        // URL модели
        modelUrl,
        
        // Функция, которая выполняется при УСПЕШНОЙ загрузке
        function(gltf) {
            console.log('✅ 3D-модель ворона успешно загружена!');
            
            ravenModel = gltf.scene;
            
            // ⭐⭐⭐ ВАЖНОЕ ИЗМЕНЕНИЕ: УВЕЛИЧЕН МАСШТАБ ВОРОНА ⭐⭐⭐
            ravenModel.scale.set(2.5, 2.5, 2.5); // УВЕЛИЧЕНО: было 0.8, теперь 2.5
            
            ravenModel.rotation.y = Math.PI;     // Поворачиваем лицом в нужную сторону
            
            scene.add(ravenModel);
            
            updateGameStatus('Ворон загружен! Начинаю полёт...', 'success');
            console.log('Модель добавлена в сцену с масштабом 2.5');
            
            // Проверяем размеры модели (для отладки)
            const box = new THREE.Box3().setFromObject(ravenModel);
            const size = box.getSize(new THREE.Vector3());
            console.log(`Размер модели после масштабирования: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
            
            // Добавляем подсветку для отладки (жёлтая рамка вокруг ворона)
            const bboxHelper = new THREE.Box3Helper(box, 0xffff00);
            scene.add(bboxHelper);
        },
        
        // Функция, которая выполняется ВО ВРЕМЯ загрузки (прогресс)
        function(xhr) {
            if (xhr.lengthComputable) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100);
                const mbLoaded = (xhr.loaded / (1024 * 1024)).toFixed(1);
                const mbTotal = (xhr.total / (1024 * 1024)).toFixed(1);
                
                console.log(`Прогресс загрузки: ${percent}% (${mbLoaded} МБ / ${mbTotal} МБ)`);
                
                if (percent < 100) {
                    updateGameStatus(`Загрузка модели: ${percent}% (${mbLoaded} МБ)`, 'loading');
                }
            }
        },
        
        // Функция, которая выполняется при ОШИБКЕ загрузки
        function(error) {
            console.error('❌ ОШИБКА ЗАГРУЗКИ 3D-МОДЕЛИ:', error);
            
            // Показываем понятное сообщение об ошибке
            let errorMessage = 'Не удалось загрузить модель ворона. ';
            
            if (error.message.includes('404')) {
                errorMessage += 'Файл модели не найден по указанному адресу.';
            } else if (error.message.includes('CORS')) {
                errorMessage += 'Проблема с политикой безопасности браузера.';
            } else if (error.message.includes('parse')) {
                errorMessage += 'Файл модели повреждён или имеет неверный формат.';
            } else {
                errorMessage += `Техническая информация: ${error.message}`;
            }
            
            updateGameStatus(errorMessage, 'error');
            
            // СОЗДАЁМ ТЕСТОВЫЙ ОБЪЕКТ вместо модели (ТОЖЕ УВЕЛИЧЕННЫЙ)
            console.log('Создаю тестовый объект (красный куб) для отладки...');
            
            const geometry = new THREE.BoxGeometry(3, 3, 3); // УВЕЛИЧЕНО: было 1,1,1
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xff0000, // Красный цвет
                wireframe: true   // Каркасный режим (меньше нагрузки)
            });
            
            ravenModel = new THREE.Mesh(geometry, material);
            scene.add(ravenModel);
            
            updateGameStatus('Загружен тестовый объект вместо модели', 'error');
        }
    );
}

// ====== СОЗДАНИЕ ФРАГМЕНТА КАРТЫ ======
function createMapFragment() {
    console.log('Создаю фрагмент карты...');
    
    // Создаём плоский прямоугольник, похожий на фрагмент карты (УВЕЛИЧЕН)
    const geometry = new THREE.BoxGeometry(2.0, 0.1, 2.0); // УВЕЛИЧЕНО: было 1.2, 0.05, 1.2
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffd700,    // Золотистый цвет
        transparent: true,   // Прозрачность
        opacity: 0.9         // Уровень прозрачности
    });
    
    mapFragment = new THREE.Mesh(geometry, material);
    mapFragment.visible = false; // Прячем, пока ворон не "возьмёт" его
    scene.add(mapFragment);
    
    console.log('Фрагмент карты создан (увеличенный)');
}

// ====== ГЛАВНЫЙ ЦИКЛ АНИМАЦИИ ======
function animate() {
    requestAnimationFrame(animate);
    
    // Если модель ворона загружена и полёт не завершён
    if (ravenModel && progress < 1) {
        // 1. ДВИЖЕНИЕ ВДОЛЬ ТРАЕКТОРИИ
        progress += flightSpeed;
        const currentPosition = flightPath.getPoint(progress);
        ravenModel.position.copy(currentPosition);
        
        // 2. ПОВОРОТ МОДЕЛИ "ВЗГЛЯДОМ ВПЕРЁД"
        const lookAheadPoint = flightPath.getPoint(Math.min(progress + 0.01, 1));
        ravenModel.lookAt(lookAheadPoint);
        
        // 3. ЛЁГКОЕ ПОКАЧИВАНИЕ ДЛЯ ЭФФЕКТА ПАРЕНИЯ (УСИЛЕНО ДЛЯ БОЛЬШОЙ МОДЕЛИ)
        ravenModel.rotation.z = Math.sin(Date.now() * 0.001) * 0.08; // УВЕЛИЧЕНО: было 0.05
        
        // 4. ЕСЛИ ВОРОН "НЕСЁТ" ФРАГМЕНТ КАРТЫ
        if (isCarryingFragment && mapFragment) {
            mapFragment.visible = true;
            
            // Позиция фрагмента относительно модели ворона (имитация когтя)
            // СКОРРЕКТИРОВАНО ДЛЯ УВЕЛИЧЕННОЙ МОДЕЛИ
            const clawPosition = new THREE.Vector3(0.8, -1.2, 0.8); // УВЕЛИЧЕНО: было 0.4, -0.6, 0.4
            
            // Преобразуем локальную позицию в мировую
            ravenModel.localToWorld(clawPosition);
            
            // Устанавливаем позицию и вращение фрагмента
            mapFragment.position.copy(clawPosition);
            mapFragment.rotation.copy(ravenModel.rotation);
        }
        
        // 5. АВТОМАТИЧЕСКИЙ СБРОС ФРАГМЕНТА (в середине пути)
        if (progress > 0.5 && progress < 0.51 && !fragmentDropped) {
            dropFragment();
            fragmentDropped = true;
        }
    }
    
    // 6. РЕНДЕРИНГ СЦЕНЫ
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ====== ФУНКЦИЯ СБРОСА ФРАГМЕНТА КАРТЫ ======
function dropFragment() {
    if (!mapFragment) {
        console.warn('Попытка сбросить несуществующий фрагмент');
        return;
    }
    
    console.log('🗺️ Ворон сбрасывает фрагмент карты!');
    
    isCarryingFragment = false;
    updateGameStatus('Ворон сбросил фрагмент карты!', 'success');
    
    // ПРОСТАЯ АНИМАЦИЯ ПАДЕНИЯ ФРАГМЕНТА
    let fallSpeed = 0.08; // УВЕЛИЧЕНО: было 0.05
    let rotationSpeed = 0.05; // УВЕЛИЧЕНО: было 0.03
    
    function animateFall() {
        // Фрагмент падает вниз
        mapFragment.position.y -= fallSpeed;
        
        // Фрагмент вращается при падении
        mapFragment.rotation.x += rotationSpeed;
        mapFragment.rotation.z += rotationSpeed * 0.7;
        
        // Немного замедляем падение (эффект сопротивления воздуха)
        fallSpeed *= 0.995;
        
        // Продолжаем анимацию, пока фрагмент не упадёт достаточно низко
        if (mapFragment.position.y > -15) { // УВЕЛИЧЕНО: было -10
            requestAnimationFrame(animateFall);
        } else {
            console.log('Фрагмент карты упал на землю');
        }
    }
    
    animateFall();
}

// ====== ОБРАБОТКА ИЗМЕНЕНИЯ РАЗМЕРА ОКНА ======
function onWindowResize() {
    console.log('Изменение размера окна:', window.innerWidth, 'x', window.innerHeight);
    
    if (camera && renderer) {
        // Обновляем соотношение сторон камеры
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Обновляем размер рендерера
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// ====== ЗАПУСК ИГРЫ ПРИ ПОЛНОЙ ЗАГРУЗКЕ СТРАНИЦЫ ======
// Используем событие 'load' вместо 'DOMContentLoaded' для гарантированной загрузки всех ресурсов
window.addEventListener('load', function() {
    console.log('=== ВЕСЬ КОНТЕНТ СТРАНИЦЫ ЗАГРУЖЕН ===');
    console.log('Three.js доступен?', typeof THREE !== 'undefined');
    console.log('GLTFLoader доступен?', typeof THREE.GLTFLoader !== 'undefined');
    console.log('Размер экрана:', window.innerWidth, 'x', window.innerHeight);
    
    // Даём небольшую задержку для гарантии загрузки всех скриптов
    setTimeout(function() {
        console.log('Запускаю инициализацию игры...');
        init();
    }, 100);
});

// ====== ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК ======
window.addEventListener('error', function(event) {
    console.error('ГЛОБАЛЬНАЯ ОШИБКА:', event.error);
    
    // Пытаемся показать информацию об ошибке пользователю
    if (document.getElementById('status-text')) {
        document.getElementById('status-text').innerHTML = 
            `<span class="error">❌ Произошла ошибка: ${event.error.message || 'неизвестная ошибка'}</span>`;
    }
});

console.log('Файл app.js полностью загружен и готов к выполнению');
