/**
 * ОККМ Landing Page — Interactive Script
 */
(function () {
    /* ===== THREE.JS 3D GLASS WINE/WAVE SHADER ===== */
    let waveMaterial = null;
    const glassWaveCanvas = document.getElementById('3d-glass-wave');
    if (glassWaveCanvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene();
        const width = glassWaveCanvas.offsetWidth || window.innerWidth;
        const height = glassWaveCanvas.offsetHeight || 700;
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.z = 6;

        const renderer = new THREE.WebGLRenderer({ canvas: glassWaveCanvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);

        // Геометрия сетки точек для звуковой волны
        const geometry = new THREE.PlaneGeometry(16, 2.5, 120, 20);

        // Мышь для интерактивного параллакса и волнений
        const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
        window.addEventListener('mousemove', (e) => {
            // Нормализованные координаты мыши (-1 to 1)
            mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Шейдер для создания светящихся частиц абстрактной звуковой волны
        const material = new THREE.ShaderMaterial({
            vertexShader: `
                uniform float uTime;
                uniform vec2 uMouse;
                varying vec2 vUv;
                varying float vDistToMouse;

                void main() {
                    vUv = uv;
                    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                    
                    // Основная звуковая волна (суперпозиция синусоид)
                    float wave = sin(modelPosition.x * 0.8 - uTime * 2.5) * 0.35;
                    wave += cos(modelPosition.x * 1.5 + uTime * 1.8) * 0.18;
                    wave += sin(modelPosition.x * 2.5 - uTime * 3.0) * 0.08;
                    
                    // Поперечная волна по оси Y
                    float waveY = sin(modelPosition.y * 1.5 + uTime * 1.2) * 0.15;
                    wave += waveY;
                    
                    // Мягкое затухание волны к левому и правому краям (чтобы она не обрезалась резко)
                    float edgeDecay = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x);
                    wave *= edgeDecay;

                    // Интерактивное воздействие мыши
                    // Масштабируем мышь в 3D координаты плоскости
                    vec2 mouseProj = uMouse * vec2(8.0, 1.5);
                    float dist = distance(modelPosition.xy, mouseProj);
                    vDistToMouse = dist;
                    
                           vec4 viewPosition = viewMatrix * modelPosition;
                    vec4 projectedPosition = projectionMatrix * viewPosition;
                    gl_Position = projectedPosition;
                    
                    // Размер частиц зависит от расстояния до камеры и мыши
                    float sizeFactor = 1.0 + (3.0 - min(dist, 3.0)) * 0.5;
                    gl_PointSize = (18.0 * sizeFactor) * (1.0 / -viewPosition.z);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor1;
                uniform vec3 uColor2;
                varying vec2 vUv;
                varying float vDistToMouse;

                void main() {
                    // Создаем мягкую круглую частицу
                    float distToCenter = distance(gl_PointCoord, vec2(0.5));
                    if (distToCenter > 0.5) discard;
                    
                    // Мягкое экспоненциальное затухание свечения точки
                    float strength = 1.0 - (distToCenter * 2.0);
                    strength = pow(strength, 2.0);
                    
                    // Градиент по ширине волны
                    vec3 finalColor = mix(uColor1, uColor2, vUv.x);
                    
                    // Дополнительный импульс свечения вблизи курсора
                    if (vDistToMouse < 3.0) {
                        float glow = (3.0 - vDistToMouse) / 3.0;
                        finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), glow * 0.3);
                    }

                    gl_FragColor = vec4(finalColor, strength * 0.85);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending, // Аддитивное смешивание для красивого свечения точек
            uniforms: {
                uTime: { value: 0 },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uColor1: { value: new THREE.Color('#06B6D4') },
                uColor2: { value: new THREE.Color('#8B5CF6') }
            }
        });

        waveMaterial = material;

        // Создаем систему частиц (Points) вместо цельной плоскости
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        const clock = new THREE.Clock();
        let animationFrameId = null;
        let isCanvasVisible = true;

        function tick() {
            if (!isCanvasVisible) {
                animationFrameId = null;
                return;
            }
            const elapsedTime = clock.getElapsedTime();
            material.uniforms.uTime.value = elapsedTime;

            // Плавное следование координат мыши
            mouse.x += (mouse.targetX - mouse.x) * 0.08;
            mouse.y += (mouse.targetY - mouse.y) * 0.08;
            material.uniforms.uMouse.value.set(mouse.x, mouse.y);

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(tick);
        }

        const waveObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isCanvasVisible = entry.isIntersecting;
                if (isCanvasVisible) {
                    if (!animationFrameId) {
                        clock.getDelta(); // сбросить дельту времени
                        tick();
                    }
                } else {
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                }
            });
        }, { threshold: 0.05 });

        waveObserver.observe(glassWaveCanvas);

        // Адаптивность при ресайзе
        window.addEventListener('resize', () => {
            camera.aspect = glassWaveCanvas.offsetWidth / glassWaveCanvas.offsetHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(glassWaveCanvas.offsetWidth, glassWaveCanvas.offsetHeight);
        });
    }

    /* ===== HEADER SCROLL ===== */
    const header = document.getElementById('header');
    let lastScroll = 0;

    function handleHeaderScroll() {
        const scrollY = window.scrollY;
        if (scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        lastScroll = scrollY;
    }

    window.addEventListener('scroll', handleHeaderScroll, { passive: true });

    /* ===== MOBILE MENU ===== */
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobile-menu');

    if (burger && mobileMenu) {
        burger.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            burger.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });

        mobileMenu.querySelectorAll('.mobile-menu__link, .mobile-menu__cta').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                burger.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /* ===== SMOOTH SCROLL ===== */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerHeight = header.offsetHeight;
                const targetPos = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
                window.scrollTo({ top: targetPos, behavior: 'smooth' });
            }
        });
    });

    /* ===== SCROLL ANIMATIONS (Intersection Observer) ===== */
    const animateElements = document.querySelectorAll('[data-animate]');

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay) || 0;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animateElements.forEach(el => observer.observe(el));

    /* ===== STEPS LINE ANIMATION ===== */
    const stepsLine = document.querySelector('.steps__line');
    if (stepsLine) {
        const stepsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    stepsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        stepsObserver.observe(stepsLine);
    }

    /* ===== COUNTER ANIMATION ===== */
    function animateCounters() {
        const counters = document.querySelectorAll('[data-count]');

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.count);
                    const duration = 2000;
                    const start = performance.now();
                    el.textContent = '0';

                    function updateCount(now) {
                        const elapsed = now - start;
                        const progress = Math.min(elapsed / duration, 1);
                        // Ease out cubic
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        const current = Math.round(target * easeOut);
                        el.textContent = current;

                        if (progress < 1) {
                            requestAnimationFrame(updateCount);
                        }
                    }

                    requestAnimationFrame(updateCount);
                    counterObserver.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(c => counterObserver.observe(c));
    }

    animateCounters();

    /* ===== FAQ ACCORDION ===== */
    const faqItems = document.querySelectorAll('.faq__item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq__question');
        const answer = item.querySelector('.faq__answer');

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all
            faqItems.forEach(other => {
                other.classList.remove('active');
                const otherAnswer = other.querySelector('.faq__answer');
                otherAnswer.style.maxHeight = '0';
                other.querySelector('.faq__question').setAttribute('aria-expanded', 'false');
            });

            // Open clicked
            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });

    /* ===== FORM HANDLING (EmailJS) ===== */
    const EMAILJS_PUBLIC_KEY = 'adWej6hLDfdf6li8s';
    const EMAILJS_SERVICE_ID = 'service_wbkc2co';
    const EMAILJS_TEMPLATE_ID = 'template_99jgenj';

    // Initialize EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }

    const form = document.getElementById('cta-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = document.getElementById('form-submit');
            const originalHTML = submitBtn.innerHTML;

            const name = document.getElementById('form-name').value;
            const phone = document.getElementById('form-phone').value;
            const company = document.getElementById('form-company').value;
            const industry = document.getElementById('form-industry').value;

            // Collect form data
            const templateParams = {
                from_name: name,
                phone: phone,
                company: company,
                industry: industry,
            };

            // Visual feedback — loading
            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="spin">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="10" stroke-linecap="round"/>
                </svg>
                Отправка...
            `;
            submitBtn.disabled = true;

            // Функция перехода на WhatsApp при успешной отправке
            const sendToWhatsApp = () => {
                const isEn = window.location.pathname.includes('/en/');
                const text = isEn 
                    ? `Hello! Demo Request from OKKM website:\n\nName: ${name}\nPhone: ${phone}\nCompany: ${company}\nIndustry: ${industry}`
                    : `Здравствуйте! Заявка на демо с сайта OKKM:\n\nИмя: ${name}\nТелефон: ${phone}\nCompany: ${company}\nОтрасль: ${industry}`;
                const waUrl = `https://wa.me/77775556789?text=${encodeURIComponent(text)}`;
                window.open(waUrl, '_blank');
            };

            // Check if EmailJS is configured
            if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
                // Demo mode — simulate sending
                console.warn('EmailJS не настроен. Работает в демо-режиме. Данные формы:', templateParams);
                setTimeout(() => {
                    showSuccess(submitBtn, originalHTML);
                    sendToWhatsApp();
                }, 1000);
                return;
            }

            // Real EmailJS send
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                .then(() => {
                    showSuccess(submitBtn, originalHTML);
                    sendToWhatsApp();
                })
                .catch((error) => {
                    console.error('EmailJS error:', error);
                    submitBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Ошибка отправки
                    `;
                    submitBtn.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';

                    setTimeout(() => {
                        submitBtn.innerHTML = originalHTML;
                        submitBtn.disabled = false;
                        submitBtn.style.background = '';
                    }, 3000);
                });
        });
    }

    function showSuccess(submitBtn, originalHTML) {
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L8 14L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Заявка отправлена!
        `;
        submitBtn.style.background = 'linear-gradient(135deg, #10B981, #06B6D4)';

        setTimeout(() => {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
            submitBtn.style.background = '';
            form.reset();
        }, 3000);
    }

    /* ===== PHONE INPUT MASK ===== */
    const phoneInput = document.getElementById('form-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            let formatted = '';

            if (value.length > 0) {
                if (value[0] === '7' || value[0] === '8') {
                    formatted = '+7';
                    if (value.length > 1) {
                        formatted += ' (' + value.substring(1, 4);
                    }
                    if (value.length >= 4) {
                        formatted += ') ' + value.substring(4, 7);
                    }
                    if (value.length >= 7) {
                        formatted += '-' + value.substring(7, 9);
                    }
                    if (value.length >= 9) {
                        formatted += '-' + value.substring(9, 11);
                    }
                } else {
                    formatted = '+' + value;
                }
            }

            e.target.value = formatted;
        });
    }

    /* ===== PARALLAX EFFECT ON HERO BADGE ===== */
    const heroVisual = document.querySelector('.hero__visual');
    const badgeImg = document.getElementById('hero-badge-img');

    if (heroVisual && badgeImg && window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;

            requestAnimationFrame(() => {
                badgeImg.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
            });
        });
    }

    /* ===== CSS custom properties for spinning animation ===== */
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .spin {
            animation: spin 1s linear infinite;
        }
        .burger.active span:nth-child(1) {
            transform: translateY(7px) rotate(45deg);
        }
        .burger.active span:nth-child(2) {
            opacity: 0;
        }
        .burger.active span:nth-child(3) {
            transform: translateY(-7px) rotate(-45deg);
        }
    `;
    document.head.appendChild(styleSheet);

    /* ===== SECRET SHORTCUT FOR DEMO ===== */
    window.addEventListener('keydown', (e) => {
        const isD = e.key.toLowerCase() === 'd';
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && isD) {
            e.preventDefault();
            const prefix = window.location.pathname.includes('/en/') ? '../' : '';
            window.location.href = prefix + 'demo.html';
        }
    });


    /* ===== VIDEO MODAL & AI SIMULATION ===== */
    const openVideoBtn = document.getElementById('open-video-btn');
    const closeVideoBtn = document.getElementById('close-video-btn');
    const videoModalOverlay = document.getElementById('video-modal-overlay');
    const videoModal = document.getElementById('video-modal');
    const startSimulationBtn = document.getElementById('start-simulation-btn');
    const videoPlaceholderContent = document.getElementById('video-placeholder-content');
    const videoSimulation = document.getElementById('video-simulation');
    const simTerminalText = document.getElementById('sim-terminal-text');

    function openModal() {
        if (videoModal) videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (videoModal) videoModal.classList.remove('active');
        document.body.style.overflow = '';
        if (videoSimulation) videoSimulation.style.display = 'none';
        if (videoPlaceholderContent) videoPlaceholderContent.style.display = 'block';
        if (simTerminalText) simTerminalText.innerHTML = '';
    }

        if (openVideoBtn) openVideoBtn.addEventListener('click', openModal);
    if (closeVideoBtn) closeVideoBtn.addEventListener('click', closeModal);
    if (videoModalOverlay) videoModalOverlay.addEventListener('click', closeModal);

    // Предотвращаем закрытие модалки при клике на ее контент (остановка всплытия)
    const modalContent = document.querySelector('.modal__content');
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal && videoModal.classList.contains('active')) {
            closeModal();
        }
    });

    const simLines = [
        { text: "> Initializing AiProtocol Audio Processor...", delay: 500, color: "#06B6D4" },
        { text: "> Loading acoustic models (RU-KZ)... Done.", delay: 800, color: "#22c55e" },
        { text: "> Connection status: Audioshield Active.", delay: 600, color: "#22c55e" },
        { text: "> Stream started. Analyzing room noise: 42dB (Excellent).", delay: 1000, color: "#e2e8f0" },
        { text: "\n[00:02] Employee: Здравствуйте! Заправляем полный бак?", delay: 1500, color: "#3B82F6" },
        { text: "[00:05] Customer: Да, 95-й, пожалуйста.", delay: 1200, color: "#f8fafc" },
        { text: "[00:08] Employee: Отлично. У нас сегодня акция: при заправке от 30 литров — наш фирменный кофе со скидкой 50%. Желаете попробовать?", delay: 2000, color: "#3B82F6" },
        { text: "[00:14] Customer: Хм, ну давайте капучино с собой.", delay: 1500, color: "#f8fafc" },
        { text: "[00:17] Employee: Заказ принят. Оплата картой?", delay: 1000, color: "#3B82F6" },
        { text: "[00:20] Customer: Да, бесконтактно.", delay: 800, color: "#f8fafc" },
        { text: "\n> Analyzing conversation metrics...", delay: 1200, color: "#eab308" },
        { text: "  - Приветствие: Использовано [ВЕРНО]", delay: 600, color: "#22c55e" },
        { text: "  - Выявление потребности: Пройдено [ВЕРНО]", delay: 500, color: "#22c55e" },
        { text: "  - Предложение акции/допродажа: Да (Кофе) [ВЕРНО]", delay: 500, color: "#22c55e" },
        { text: "  - Тон сотрудника: Вежливый, вовлеченный [9.2/10]", delay: 700, color: "#06B6D4" },
        { text: "  - Конфликтность: 0% [БЕЗОПАСНО]", delay: 400, color: "#22c55e" },
        { text: "\n> ИИ-ВЕРДИКТ: Диалог успешный. Средний чек увеличен на 1200 ₸. Данные отправлены в дашборд.", delay: 1500, color: "#22c55e" },
        { text: "\n[СИМУЛЯЦИЯ ЗАВЕРШЕНА. Спасибо за просмотр!]", delay: 1000, color: "#06B6D4" }
    ];

    if (startSimulationBtn) {
        startSimulationBtn.addEventListener('click', () => {
            if (videoPlaceholderContent) videoPlaceholderContent.style.display = 'none';
            if (videoSimulation) videoSimulation.style.display = 'block';
            
            let currentLine = 0;
            if (simTerminalText) simTerminalText.innerHTML = "";

            function typeNextLine() {
                if (currentLine < simLines.length) {
                    const line = simLines[currentLine];
                    const p = document.createElement('p');
                    p.style.color = line.color;
                    p.style.margin = "4px 0";
                    p.style.fontSize = "13px";
                    p.style.fontFamily = "monospace";
                    
                    if (line.text.startsWith("\n")) {
                        p.innerHTML = "<br>" + line.text.substring(2);
                    } else {
                        p.textContent = line.text;
                    }
                    
                    if (simTerminalText) {
                        simTerminalText.appendChild(p);
                        videoSimulation.scrollTop = videoSimulation.scrollHeight;
                        
                        // Посимвольный вывод текста
                        const textToType = line.text.startsWith("\\n") ? line.text.substring(2) : line.text;
                        p.textContent = line.text.startsWith("\\n") ? "\n" : "";
                        
                        let charIdx = 0;
                        function typeChar() {
                            if (charIdx < textToType.length) {
                                p.textContent += textToType[charIdx];
                                charIdx++;
                                videoSimulation.scrollTop = videoSimulation.scrollHeight;
                                setTimeout(typeChar, 15 + Math.random() * 15); // Случайная задержка для естественности
                            } else {
                                currentLine++;
                                setTimeout(typeNextLine, line.delay);
                            }
                        }
                        typeChar();
                    } else {
                        currentLine++;
                        setTimeout(typeNextLine, line.delay);
                    }
                }
            }
            
            typeNextLine();
        });
    }

    // Обработка отправки формы тест-драйва
    const tdForm = document.getElementById('test-drive-form');
    if (tdForm) {
        tdForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('td-submit');
            const originalHTML = submitBtn.innerHTML;
            
            const name = document.getElementById('td-name').value;
            const phone = document.getElementById('td-phone').value;
            const company = document.getElementById('td-company').value;

            submitBtn.innerHTML = `
                Отправка...
            `;
            submitBtn.disabled = true;

            setTimeout(() => {
                submitBtn.innerHTML = "Заявка успешно отправлена! ✓";
                submitBtn.style.background = "#22c55e";
                submitBtn.style.borderColor = "#22c55e";
                
                // Перенаправление на WhatsApp с параметрами тест-драйва
                const isEn = window.location.pathname.includes('/en/');
                const text = isEn 
                    ? `Hello! Request for 2 free badges (Test Drive):\n\nName: ${name}\nPhone: ${phone}\nCompany: ${company}`
                    : `Здравствуйте! Запрос 2-х бейджей (тест-драйв):\n\nИмя: ${name}\nТелефон: ${phone}\nКомпания: ${company}`;
                const waUrl = `https://wa.me/77775556789?text=${encodeURIComponent(text)}`;
                window.open(waUrl, '_blank');

                tdForm.reset();
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.style.background = "";
                    submitBtn.style.borderColor = "";
                    submitBtn.disabled = false;
                }, 3000);
            }, 1000);
        });
    }

    // Интерактивное переключение шагов в блоке "Как это работает"
    const steps = document.querySelectorAll('.step');
    const slides = document.querySelectorAll('.preview-slide');

    if (steps.length > 0 && slides.length > 0) {
        steps.forEach(step => {
            step.addEventListener('click', () => {
                const targetStep = step.getAttribute('data-step');
                
                // Деактивируем все шаги и слайды
                steps.forEach(s => s.classList.remove('active'));
                slides.forEach(sl => sl.classList.remove('active'));
                
                // Активируем нужный шаг и слайд
                step.classList.add('active');
                const targetSlide = document.getElementById(`slide-${targetStep}`);
                if (targetSlide) {
                    targetSlide.classList.add('active');
                }
            });
        });
    }

    // Логика калькулятора ROI
    const rangeBadges = document.getElementById('range-badges');
    const rangeTicket = document.getElementById('range-ticket');
    const rangeTx = document.getElementById('range-tx');

    const valBadges = document.getElementById('val-badges');
    const valTicket = document.getElementById('val-ticket');
    const valTx = document.getElementById('val-tx');

    const resultRevenue = document.getElementById('roi-additional-revenue');
    const resultSavings = document.getElementById('roi-savings');

    function calculateROI() {
        if (!rangeBadges || !rangeTicket || !rangeTx) return;

        const points = parseInt(rangeBadges.value);
        const emps = parseInt(rangeTicket.value);
        const shiftDuration = parseInt(rangeTx.value);

        // Определяем локаль по URL
        const isEn = window.location.pathname.includes('/en/');

        // Обновляем лейблы слайдеров
        if (isEn) {
            valBadges.textContent = `${points} ${points === 1 ? 'point' : 'points'}`;
            valTicket.textContent = `${emps} ppl`;
            valTx.textContent = `${shiftDuration} hrs`;
        } else {
            valBadges.textContent = `${points} ${points === 1 ? 'точка' : points < 5 ? 'точки' : 'точек'}`;
            valTicket.textContent = `${emps} чел`;
            valTx.textContent = `${shiftDuration} ч`;
        }

        // Логика смен: если смена 12 часов — считаем круглосуточную работу (2 смены в сутки), иначе дневную (1 смена в сутки)
        const shiftsPerDay = (shiftDuration === 12) ? 2 : 1;
        const totalHours = points * emps * shiftDuration * shiftsPerDay * 30;

        // Себестоимость ИИ: 0.3$ за час
        const totalAiCost = Math.round(totalHours * 0.3);
        // Тариф для клиента: 0.5$ за час
        const clientCost = Math.round(totalHours * 0.5);

        // Конвертация в тенге для русскоязычной версии (курс 450 ₸ за 1$)
        const clientCostKzt = Math.round(clientCost * 450);

        if (isEn) {
            resultRevenue.textContent = `${totalHours.toLocaleString('en-US')} hrs`;
            resultSavings.textContent = `$${clientCost.toLocaleString('en-US')} / mo`;
        } else {
            resultRevenue.textContent = `${totalHours.toLocaleString('ru-RU')} ч`;
            resultSavings.textContent = `$${clientCost.toLocaleString('ru-RU')} / мес (${clientCostKzt.toLocaleString('ru-RU')} ₸)`;
        }

        // Обновляем визуальный мини-график
        const barCosts = document.getElementById('bar-costs');
        const barRevenue = document.getElementById('bar-revenue');
        const barCostsLabel = document.getElementById('bar-costs-label');
        const barRevenueLabel = document.getElementById('bar-revenue-label');

        if (barCosts && barRevenue && barCostsLabel && barRevenueLabel) {
            barCostsLabel.textContent = `$${totalAiCost.toLocaleString('en-US')}`;
            barRevenueLabel.textContent = `$${clientCost.toLocaleString('en-US')}`;

            // Вычисляем пропорциональные высоты
            const maxVal = Math.max(clientCost, 1);
            const costRatio = totalAiCost / maxVal;
            
            const revenueHeight = 80;
            const costsHeight = Math.min(80, Math.max(8, Math.round(revenueHeight * costRatio)));
            
            barRevenue.style.height = `${revenueHeight}px`;
            barCosts.style.height = `${costsHeight}px`;
        }
    }

    if (rangeBadges && rangeTicket && rangeTx) {
        [rangeBadges, rangeTicket, rangeTx].forEach(input => {
            input.addEventListener('input', calculateROI);
        });
        // Инициализируем расчет при загрузке
        calculateROI();
    }

    // Логика виджета AI Demo
    const demoPlayBtn = document.getElementById('demo-play-btn');
    const demoPlayerBox = document.getElementById('demo-player-box');
    const playIcon = document.getElementById('play-icon');
    const demoTime = document.getElementById('demo-time');
    const demoTranscript = document.getElementById('demo-transcript');
    const demoScore = document.getElementById('demo-score');
    
    // Элементы чек-листа
    const chkGreeting = document.getElementById('chk-greeting');
    const chkCoffee = document.getElementById('chk-coffee');
    const chkPromo = document.getElementById('chk-promo');
    const chkReceipt = document.getElementById('chk-receipt');
    const chkFarewell = document.getElementById('chk-farewell');
    const aiRecText = document.getElementById('ai-rec-text');

    let isPlaying = false;
    let playInterval = null;
    let currentTime = 0;
    let currentDemoType = 'bad'; // 'bad' или 'good'
    const duration = 28;

    let messages = [];

    // Данные для транскриптов
    const transcripts = {
        bad: {
            ru: `
                <div class="transcript-message highlight-red" data-time="1">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Павел Б.)</span>
                        <span class="message-timestamp">00:01</span>
                    </div>
                    <div class="message-text">Здрасьте.</div>
                    <span class="message-badge message-badge--danger">Нарушение приветствия</span>
                </div>
                <div class="transcript-message" data-time="4">
                    <div class="message-meta">
                        <span class="message-speaker">Клиент</span>
                        <span class="message-timestamp">00:04</span>
                    </div>
                    <div class="message-text">Добрый день. Мне 20 литров АИ-92 на 4 колонку.</div>
                </div>
                <div class="transcript-message highlight-red" data-time="8">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Павел Б.)</span>
                        <span class="message-timestamp">00:08</span>
                    </div>
                    <div class="message-text">4600 тенге к оплате.</div>
                    <span class="message-badge message-badge--danger">Пропущен повтор заказа</span>
                </div>
                <div class="transcript-message" data-time="12">
                    <div class="message-meta">
                        <span class="message-speaker">Клиент</span>
                        <span class="message-timestamp">00:12</span>
                    </div>
                    <div class="message-text">Держите карту.</div>
                </div>
                <div class="transcript-message highlight-red" data-time="15">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Павел Б.)</span>
                        <span class="message-timestamp">00:15</span>
                    </div>
                    <div class="message-text">Что-нибудь еще?</div>
                    <span class="message-badge message-badge--danger">Запрещенный кросс-сейл</span>
                </div>
                <div class="transcript-message" data-time="18">
                    <div class="message-meta">
                        <span class="message-speaker">Клиент</span>
                        <span class="message-timestamp">00:18</span>
                    </div>
                    <div class="message-text">Нет.</div>
                </div>
                <div class="transcript-message highlight-red" data-time="21">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Павел Б.)</span>
                        <span class="message-timestamp">00:21</span>
                    </div>
                    <div class="message-text">Чек нужен?</div>
                    <span class="message-badge message-badge--danger">Запрещенный вопрос про чек</span>
                </div>
                <div class="transcript-message" data-time="24">
                    <div class="message-meta">
                        <span class="message-speaker">Клиент</span>
                        <span class="message-timestamp">00:24</span>
                    </div>
                    <div class="message-text">Да.</div>
                </div>
                <div class="transcript-message highlight-red" data-time="27">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Павел Б.)</span>
                        <span class="message-timestamp">00:27</span>
                    </div>
                    <div class="message-text">До свидания.</div>
                    <span class="message-badge message-badge--danger">Нарушение стандарта прощания</span>
                </div>
            `,
            en: `
                <div class="transcript-message highlight-red" data-time="1">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Pavel B.)</span>
                        <span class="message-timestamp">00:01</span>
                    </div>
                    <div class="message-text">Hi there.</div>
                    <span class="message-badge message-badge--danger">Greeting Violation</span>
                </div>
                <div class="transcript-message" data-time="4">
                    <div class="message-meta">
                        <span class="message-speaker">Client</span>
                        <span class="message-timestamp">00:04</span>
                    </div>
                    <div class="message-text">Good day. 20 liters of Regular on pump 4, please.</div>
                </div>
                <div class="transcript-message highlight-red" data-time="8">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Pavel B.)</span>
                        <span class="message-timestamp">00:08</span>
                    </div>
                    <div class="message-text">4600 KZT to pay.</div>
                    <span class="message-badge message-badge--danger">Order Repeat Missed</span>
                </div>
                <div class="transcript-message" data-time="12">
                    <div class="message-meta">
                        <span class="message-speaker">Client</span>
                        <span class="message-timestamp">00:12</span>
                    </div>
                    <div class="message-text">Here is my card.</div>
                </div>
                <div class="transcript-message highlight-red" data-time="15">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Pavel B.)</span>
                        <span class="message-timestamp">00:15</span>
                    </div>
                    <div class="message-text">Anything else?</div>
                    <span class="message-badge message-badge--danger">Forbidden Cross-sale Question</span>
                </div>
                <div class="transcript-message" data-time="18">
                    <div class="message-meta">
                        <span class="message-speaker">Client</span>
                        <span class="message-timestamp">00:18</span>
                    </div>
                    <div class="message-text">No.</div>
                </div>
                <div class="transcript-message highlight-red" data-time="21">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Pavel B.)</span>
                        <span class="message-timestamp">00:21</span>
                    </div>
                    <div class="message-text">Do you need a receipt?</div>
                    <span class="message-badge message-badge--danger">Forbidden Receipt Question</span>
                </div>
                <div class="transcript-message" data-time="24">
                    <div class="message-meta">
                        <span class="message-speaker">Client</span>
                        <span class="message-timestamp">00:24</span>
                    </div>
                    <div class="message-text">Yes.</div>
                </div>
                <div class="transcript-message highlight-red" data-time="27">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Pavel B.)</span>
                        <span class="message-timestamp">00:27</span>
                    </div>
                    <div class="message-text">Bye.</div>
                    <span class="message-badge message-badge--danger">Farewell Violation</span>
                </div>
            `
        },
        good: {
            ru: `
                <div class="transcript-message highlight-green" data-time="1">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Мария К.)</span>
                        <span class="message-timestamp">00:01</span>
                    </div>
                    <div class="message-text">Здравствуйте! Добро пожаловать на Nomad. Меня зовут Мария.</div>
                    <span class="message-badge message-badge--success">Приветствие выполнено</span>
                </div>
                <div class="transcript-message" data-time="4">
                    <div class="message-meta">
                        <span class="message-speaker">Клиент</span>
                        <span class="message-timestamp">00:04</span>
                    </div>
                    <div class="message-text">Добрый день. Мне 20 литров АИ-92 на 4 колонку.</div>
                </div>
                <div class="transcript-message highlight-green" data-time="8">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Мария К.)</span>
                        <span class="message-timestamp">00:08</span>
                    </div>
                    <div class="message-text">20 литров АИ-92, четвертая колонка, всё верно. 4600 тенге к оплате.</div>
                    <span class="message-badge message-badge--success">Заказ повторен</span>
                </div>
                <div class="transcript-message" data-time="12">
                    <div class="message-meta">
                        <span class="message-speaker">Клиент</span>
                        <span class="message-timestamp">00:12</span>
                    </div>
                    <div class="message-text">Да, всё верно. Оплата картой.</div>
                </div>
                <div class="transcript-message highlight-green" data-time="15">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Мария К.)</span>
                        <span class="message-timestamp">00:15</span>
                    </div>
                    <div class="message-text">У нас сегодня свежие круассаны и отличный кофе. Возьмете капучино в дорогу?</div>
                    <span class="message-badge message-badge--success">Предложен кофе/выпечка</span>
                </div>
                <div class="transcript-message" data-time="18">
                    <div class="message-meta">
                        <span class="message-speaker">Клиент</span>
                        <span class="message-timestamp">00:18</span>
                    </div>
                    <div class="message-text">О, давайте, спасибо! Как раз хотел взбодриться.</div>
                </div>
                <div class="transcript-message highlight-green" data-time="21">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Мария К.)</span>
                        <span class="message-timestamp">00:21</span>
                    </div>
                    <div class="message-text">Отлично. И также у нас сейчас акция: при заправке от 20 литров скидка 50% на омыватель. Добавим?</div>
                    <span class="message-badge message-badge--success">Озвучена промо-акция</span>
                </div>
                <div class="transcript-message" data-time="24">
                    <div class="message-meta">
                        <span class="message-speaker">Клиент</span>
                        <span class="message-timestamp">00:24</span>
                    </div>
                    <div class="message-text">Да, давайте омыватель тоже возьму, полезная вещь.</div>
                </div>
                <div class="transcript-message highlight-green" data-time="27">
                    <div class="message-meta">
                        <span class="message-speaker">Кассир (Мария К.)</span>
                        <span class="message-timestamp">00:27</span>
                    </div>
                    <div class="message-text">Приложите карту, пожалуйста. Вот ваш чек. Хорошей вам дороги и до встречи на Nomad!</div>
                    <span class="message-badge message-badge--success">Чек выдан • Прощание выполнено</span>
                </div>
            `,
            en: `
                <div class="transcript-message highlight-green" data-time="1">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Maria K.)</span>
                        <span class="message-timestamp">00:01</span>
                    </div>
                    <div class="message-text">Hello! Welcome to Nomad. My name is Maria.</div>
                    <span class="message-badge message-badge--success">Standard Greeting</span>
                </div>
                <div class="transcript-message" data-time="4">
                    <div class="message-meta">
                        <span class="message-speaker">Client</span>
                        <span class="message-timestamp">00:04</span>
                    </div>
                    <div class="message-text">Hi. 20 liters of Regular on pump 4, please.</div>
                </div>
                <div class="transcript-message highlight-green" data-time="8">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Maria K.)</span>
                        <span class="message-timestamp">00:08</span>
                    </div>
                    <div class="message-text">20 liters of Regular, pump 4. Perfect. That will be $35.</div>
                    <span class="message-badge message-badge--success">Order Repeated</span>
                </div>
                <div class="transcript-message" data-time="12">
                    <div class="message-meta">
                        <span class="message-speaker">Client</span>
                        <span class="message-timestamp">00:12</span>
                    </div>
                    <div class="message-text">Yes, card payment.</div>
                </div>
                <div class="transcript-message highlight-green" data-time="15">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Maria K.)</span>
                        <span class="message-timestamp">00:15</span>
                    </div>
                    <div class="message-text">We have fresh croissants and premium coffee today. Would you like a warm cappuccino to go?</div>
                    <span class="message-badge message-badge--success">Coffee/Pastry Offered</span>
                </div>
                <div class="transcript-message" data-time="18">
                    <div class="message-meta">
                        <span class="message-speaker">Client</span>
                        <span class="message-timestamp">00:18</span>
                    </div>
                    <div class="message-text">Oh, sounds great. Let's do a cappuccino, thank you.</div>
                </div>
                <div class="transcript-message highlight-green" data-time="21">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Maria K.)</span>
                        <span class="message-timestamp">00:21</span>
                    </div>
                    <div class="message-text">Excellent. And we also have a promo: with 20 liters of fuel, you get 50% off windshield fluid. Shall I add it?</div>
                    <span class="message-badge message-badge--success">Promo Mentioned</span>
                </div>
                <div class="transcript-message" data-time="24">
                    <div class="message-meta">
                        <span class="message-speaker">Client</span>
                        <span class="message-timestamp">00:24</span>
                    </div>
                    <div class="message-text">Sure, add the fluid as well. Useful thing.</div>
                </div>
                <div class="transcript-message highlight-green" data-time="27">
                    <div class="message-meta">
                        <span class="message-speaker">Cashier (Maria K.)</span>
                        <span class="message-timestamp">00:27</span>
                    </div>
                    <div class="message-text">Please tap your card. Here is your receipt. Have a safe trip and see you next time at Nomad!</div>
                    <span class="message-badge message-badge--success">Receipt Issued • Standard Farewell</span>
                </div>
            `
        }
    };

    function updateMessages() {
        messages = Array.from(document.querySelectorAll('.transcript-message'));
    }

    function resetDemo() {
        clearInterval(playInterval);
        isPlaying = false;
        currentTime = 0;
        demoTime.textContent = '00:00';
        playIcon.className = 'ph ph-play';
        demoPlayerBox.classList.remove('playing');
        
        // Подгружаем нужный транскрипт
        const isEn = window.location.pathname.includes('/en/');
        const lang = isEn ? 'en' : 'ru';
        demoTranscript.innerHTML = transcripts[currentDemoType][lang];

        updateMessages();
        messages.forEach(msg => {
            msg.classList.remove('active');
        });
        
        demoScore.textContent = '0%';
        demoScore.className = 'score-circle';
        
        resetChecklist();
        
        aiRecText.textContent = isEn 
            ? 'Start the conversation recording to automatically generate recommendations...'
            : 'Запустите запись разговора для автоматической генерации рекомендаций...';
    }

    function resetChecklist() {
        [chkGreeting, chkCoffee, chkPromo, chkReceipt, chkFarewell].forEach(item => {
            if (item) {
                item.querySelector('.checklist-icon').innerHTML = '<i class="ph ph-circle"></i>';
                item.querySelector('.checklist-icon').className = 'checklist-icon';
                item.style.color = 'var(--c-text-muted)';
            }
        });
    }

    function updateChecklistItem(item, status) {
        if (!item) return;
        const icon = item.querySelector('.checklist-icon');
        if (status === 'success') {
            icon.innerHTML = '<i class="ph ph-check-bold"></i>';
            icon.className = 'checklist-icon checklist-icon--success';
            item.style.color = 'white';
        } else if (status === 'failed') {
            icon.innerHTML = '<i class="ph ph-x-bold"></i>';
            icon.className = 'checklist-icon checklist-icon--failed';
            item.style.color = 'white';
        }
    }

    function runDemo() {
        updateMessages();
        if (isPlaying) {
            clearInterval(playInterval);
            isPlaying = false;
            playIcon.className = 'ph ph-play';
            demoPlayerBox.classList.remove('playing');
        } else {
            if (currentTime >= duration) {
                resetDemo();
            }

            isPlaying = true;
            playIcon.className = 'ph ph-pause';
            demoPlayerBox.classList.add('playing');
            
            const isEn = window.location.pathname.includes('/en/');

            playInterval = setInterval(() => {
                currentTime++;
                if (currentTime > duration) {
                    clearInterval(playInterval);
                    isPlaying = false;
                    playIcon.className = 'ph ph-play';
                    demoPlayerBox.classList.remove('playing');
                    return;
                }

                const formatTime = currentTime < 10 ? `00:0${currentTime}` : `00:${currentTime}`;
                demoTime.textContent = formatTime;

                messages.forEach(msg => {
                    const msgTime = parseInt(msg.getAttribute('data-time'));
                    if (currentTime >= msgTime) {
                        if (!msg.classList.contains('active')) {
                            msg.classList.add('active');
                            demoTranscript.scrollTo({
                                top: msg.offsetTop - demoTranscript.offsetTop - 40,
                                behavior: 'smooth'
                            });
                        }
                    }
                });

                // Логика поэтапного заполнения в зависимости от звонка
                if (currentDemoType === 'bad') {
                    if (currentTime >= 1) {
                        updateChecklistItem(chkGreeting, 'failed');
                        demoScore.textContent = '0%';
                    }
                    if (currentTime >= 8) {
                        updateChecklistItem(chkCoffee, 'failed');
                        demoScore.textContent = '10%';
                    }
                    if (currentTime >= 15) {
                        updateChecklistItem(chkPromo, 'failed');
                        demoScore.textContent = '18%';
                    }
                    if (currentTime >= 21) {
                        updateChecklistItem(chkReceipt, 'failed');
                        demoScore.textContent = '24%';
                    }
                    if (currentTime >= 27) {
                        updateChecklistItem(chkFarewell, 'failed');
                        demoScore.textContent = '29%';
                        demoScore.className = 'score-circle score-red';
                        
                        aiRecText.innerHTML = isEn
                            ? '<strong>Critical standard non-compliance:</strong> The cashier used a dry "Hi there" greeting, did not offer coffee/pastries, missed the promo campaign, and asked a forbidden receipt question. <br><strong>Lost Profit:</strong> $6.50 (3,000 KZT). <br><em>Recommendation: Assign a mini-training on active sales standards.</em>'
                            : '<strong>Критическое нарушение стандартов:</strong> Кассир использовал сухое приветствие «Здрасьте», проигнорировал предложение кофе/выпечки, не озвучил промо-акцию и задал запрещенный вопрос про чек. <br><strong>Упущенная выгода:</strong> 3 000 ₸. <br><em>Рекомендация: Назначить повторный курс по стандартам обслуживания на АЗС.</em>';
                    }
                } else {
                    // Хороший звонок
                    if (currentTime >= 1) {
                        updateChecklistItem(chkGreeting, 'success');
                        demoScore.textContent = '20%';
                        demoScore.className = 'score-circle score-green';
                    }
                    if (currentTime >= 8) {
                        demoScore.textContent = '35%';
                    }
                    if (currentTime >= 15) {
                        updateChecklistItem(chkCoffee, 'success');
                        demoScore.textContent = '60%';
                    }
                    if (currentTime >= 21) {
                        updateChecklistItem(chkPromo, 'success');
                        demoScore.textContent = '80%';
                    }
                    if (currentTime >= 27) {
                        updateChecklistItem(chkReceipt, 'success');
                        updateChecklistItem(chkFarewell, 'success');
                        demoScore.textContent = '96%';
                        
                        aiRecText.innerHTML = isEn
                            ? '<strong>Reference standard implementation:</strong> Cashier welcomed the client warmly, successfully upsold cappuccino, and initiated windshield fluid promo. Correct check output. <br><strong>Added Profit:</strong> +$8.50 (+3,800 KZT). <br><em>Recommendation: Reward cashier for active sales.</em>'
                            : '<strong>Эталонное соблюдение стандартов:</strong> Кассир тепло поприветствовал клиента, провел успешный кросс-сейл капучино и продал омыватель по акции. Стандарты чека и прощания выполнены на 100%. <br><strong>Дополнительная прибыль:</strong> +3 800 ₸. <br><em>Рекомендация: Поощрить кассира за активные продажи.</em>';
                    }
                }

            }, 1000);
        }
    }

    // Инициализация кнопок выбора звонка
    const demoSelectors = document.querySelectorAll('.demo-selector__btn');
    demoSelectors.forEach(btn => {
        btn.addEventListener('click', () => {
            demoSelectors.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDemoType = btn.getAttribute('data-demo');
            resetDemo();
        });
    });

    // Инициализируем стартовый вид
    resetDemo();

    if (demoPlayBtn) {
        demoPlayBtn.addEventListener('click', runDemo);
    }

    // ===== Табы для отраслей (Industries) =====
    const industryButtons = document.querySelectorAll('.industry-tab-btn');
    const industryTabs = document.querySelectorAll('.industry-content-tab');

    industryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            industryButtons.forEach(b => b.classList.remove('active'));
            industryTabs.forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });

    // ===== spotlight-эффект для карточек при движении мыши =====
    const cards = document.querySelectorAll('.problem__card, .metric-card, .industry-card, .pricing__card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // ===== Плавное появление элементов при скролле (Scroll Reveal) =====
    const animatedElements = document.querySelectorAll('.section-header, .problem__card, .metric-card, .industry-card, .pricing__card, .ai-demo__player-box, .ai-demo__analysis, .roi-calc__controls, .roi-calc__results, .cta-form');
    animatedElements.forEach(el => el.classList.add('fade-in-up'));

    const scrollObserverOptions = {
        threshold: 0.05,
        rootMargin: '0px 0px -30px 0px'
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, scrollObserverOptions);

    animatedElements.forEach(el => scrollObserver.observe(el));

    // ===== Переключение тем (Светлая / Темная) =====
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleMobileBtn = document.getElementById('theme-toggle-mobile');
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Обновляем видимость иконок на всех кнопках
        const moons = document.querySelectorAll('.theme-toggle-moon');
        const suns = document.querySelectorAll('.theme-toggle-sun');
        
        if (theme === 'light') {
            moons.forEach(m => m.style.display = 'block');
            suns.forEach(s => s.style.display = 'none');
        } else {
            moons.forEach(m => m.style.display = 'none');
            suns.forEach(s => s.style.display = 'block');
        }

        // Переключаем скриншот дашборда под тему
        const dashboardImg = document.getElementById('dashboard-img');
        if (dashboardImg) {
            const isEn = window.location.pathname.includes('/en/');
            const prefix = isEn ? '../' : '';
            if (theme === 'light') {
                dashboardImg.src = prefix + 'assets/dashboard_light.png';
            } else {
                dashboardImg.src = prefix + 'assets/dashboard_real.png';
            }
        }

        // Меняем цвет точек 3D волны под тему (темные точки для светлой темы, яркие неоновые для темной)
        if (typeof THREE !== 'undefined' && waveMaterial) {
            if (theme === 'light') {
                waveMaterial.uniforms.uColor1.value.set('#0f172a');
                waveMaterial.uniforms.uColor2.value.set('#3b82f6');
            } else {
                waveMaterial.uniforms.uColor1.value.set('#06b6d4');
                waveMaterial.uniforms.uColor2.value.set('#8b5cf6');
            }
        }
    }
    
    // Инициализация темы при загрузке
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }
    
    if (themeToggleMobileBtn) {
        themeToggleMobileBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

})();
