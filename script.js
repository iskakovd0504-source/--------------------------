/**
 * ОККМ Landing Page — Interactive Script
 */
(function () {
    /* ===== THREE.JS 3D GLASS WINE/WAVE SHADER ===== */
    const glassWaveCanvas = document.getElementById('3d-glass-wave');
    if (glassWaveCanvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, glassWaveCanvas.offsetWidth / glassWaveCanvas.offsetHeight, 0.1, 100);
        camera.position.z = 6;

        const renderer = new THREE.WebGLRenderer({ canvas: glassWaveCanvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(glassWaveCanvas.offsetWidth, glassWaveCanvas.offsetHeight);

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
                    
                    if (dist < 3.0) {
                        float force = (3.0 - dist) / 3.0;
                        // Высокочастотные волнения при приближении курсора
                        wave += sin(modelPosition.x * 12.0 + uTime * 15.0) * 0.15 * force * edgeDecay;
                    }
                    
                    modelPosition.y += wave;

                    vec4 viewPosition = viewMatrix * modelPosition;
                    vec4 projectedPosition = projectionMatrix * viewPosition;
                    gl_Position = projectedPosition;
                    
                    // Размер частиц зависит от расстояния до камеры и мыши
                    float sizeFactor = 1.0 + (3.0 - min(dist, 3.0)) * 0.5;
                    gl_PointSize = (18.0 * sizeFactor) * (1.0 / -viewPosition.z);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vDistToMouse;

                void main() {
                    // Создаем мягкую круглую частицу
                    float distToCenter = distance(gl_PointCoord, vec2(0.5));
                    if (distToCenter > 0.5) discard;
                    
                    // Мягкое экспоненциальное затухание свечения точки
                    float strength = 1.0 - (distToCenter * 2.0);
                    strength = pow(strength, 2.0);

                    // Luxury Tech Неоновые градиенты (от бирюзового к фиолетовому)
                    vec3 neonCyan = vec3(0.06, 0.65, 0.95);  // #0EA5E9
                    vec3 neonPurple = vec3(0.55, 0.36, 0.96); // #8B5CF6
                    
                    // Градиент по ширине волны
                    vec3 finalColor = mix(neonCyan, neonPurple, vUv.x);
                    
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
                uMouse: { value: new THREE.Vector2(0, 0) }
            }
        });

        // Создаем систему частиц (Points) вместо цельной плоскости
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        const clock = new THREE.Clock();

        function tick() {
            const elapsedTime = clock.getElapsedTime();
            material.uniforms.uTime.value = elapsedTime;

            // Плавное следование координат мыши
            mouse.x += (mouse.targetX - mouse.x) * 0.08;
            mouse.y += (mouse.targetY - mouse.y) * 0.08;
            material.uniforms.uMouse.value.set(mouse.x, mouse.y);

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(tick);
        }

        tick();

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

        const badges = parseInt(rangeBadges.value);
        const ticket = parseInt(rangeTicket.value);
        const tx = parseInt(rangeTx.value);

        // Определяем локаль по URL
        const isEn = window.location.pathname.includes('/en/');

        // Обновляем лейблы
        if (isEn) {
            valBadges.textContent = `${badges} pcs`;
            valTicket.textContent = `$${ticket.toLocaleString('en-US')}`;
            valTx.textContent = `${tx} pcs`;
        } else {
            valBadges.textContent = `${badges} шт`;
            valTicket.textContent = `${ticket.toLocaleString('ru-RU')} ₸`;
            valTx.textContent = `${tx} шт`;
        }

        // Расчет дополнительной выручки: 
        // Доп. выручка = Кол-во бейджей * Кол-во транзакций в день * Ср. чек * 30 дней * 15% (консервативный прирост за счет допродаж)
        const additionalRevenue = Math.round(badges * tx * ticket * 30 * 0.15);

        const savingsFactor = isEn ? 80 : 35000;
        const savings = badges * savingsFactor;

        // Стоимость ИИ-подписки (примерно 15 000 ₸ или $35 на 1 бейдж в месяц)
        const aiCostPerBadge = isEn ? 35 : 15000;
        const totalAiCost = badges * aiCostPerBadge;

        if (isEn) {
            resultRevenue.textContent = `$${additionalRevenue.toLocaleString('en-US')}`;
            resultSavings.textContent = `up to $${savings.toLocaleString('en-US')}`;
        } else {
            resultRevenue.textContent = `${additionalRevenue.toLocaleString('ru-RU')} ₸`;
            resultSavings.textContent = `до ${savings.toLocaleString('ru-RU')} ₸`;
        }

        // Обновляем визуальный мини-график
        const barCosts = document.getElementById('bar-costs');
        const barRevenue = document.getElementById('bar-revenue');
        const barCostsLabel = document.getElementById('bar-costs-label');
        const barRevenueLabel = document.getElementById('bar-revenue-label');

        if (barCosts && barRevenue && barCostsLabel && barRevenueLabel) {
            // Форматируем подписи на столбиках
            if (isEn) {
                barCostsLabel.textContent = `$${totalAiCost.toLocaleString('en-US')}`;
                barRevenueLabel.textContent = additionalRevenue >= 1000 
                    ? `$${(additionalRevenue / 1000).toFixed(1)}K` 
                    : `$${additionalRevenue}`;
            } else {
                barCostsLabel.textContent = totalAiCost >= 1000000 
                    ? `${(totalAiCost / 1000000).toFixed(1)}M ₸` 
                    : `${(totalAiCost / 1000).toFixed(0)}K ₸`;
                barRevenueLabel.textContent = additionalRevenue >= 1000000 
                    ? `${(additionalRevenue / 1000000).toFixed(1)}M ₸` 
                    : `${(additionalRevenue / 1000).toFixed(0)}K ₸`;
            }

            // Вычисляем пропорциональные высоты
            const maxProfit = Math.max(additionalRevenue, 1);
            const costRatio = totalAiCost / maxProfit;
            
            // Фиксируем чистый профит на максимуме (80px), а расходы делаем пропорциональными (минимум 8px, максимум 80px)
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
    const duration = 28; // Длительность диалога Павла Б.

    let messages = [];

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
        
        updateMessages();
        messages.forEach(msg => {
            msg.classList.remove('active');
        });
        
        demoScore.textContent = '0%';
        demoScore.className = 'score-circle';
        
        resetChecklist();
        
        const isEn = window.location.pathname.includes('/en/');
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
            // Пауза
            clearInterval(playInterval);
            isPlaying = false;
            playIcon.className = 'ph ph-play';
            demoPlayerBox.classList.remove('playing');
        } else {
            // Если воспроизведение дошло до конца, сбрасываем перед новым запуском
            if (currentTime >= duration) {
                resetDemo();
            }

            // Старт / Продолжение
            isPlaying = true;
            playIcon.className = 'ph ph-pause';
            demoPlayerBox.classList.add('playing');
            
            const isEn = window.location.pathname.includes('/en/');

            playInterval = setInterval(() => {
                currentTime++;
                if (currentTime > duration) {
                    // Останавливаем воспроизведение на финальном кадре без сброса анализа
                    clearInterval(playInterval);
                    isPlaying = false;
                    playIcon.className = 'ph ph-play';
                    demoPlayerBox.classList.remove('playing');
                    return;
                }

                // Обновляем таймер
                const formatTime = currentTime < 10 ? `00:0${currentTime}` : `00:${currentTime}`;
                demoTime.textContent = formatTime;

                // Подсвечиваем сообщения транскрипта
                messages.forEach(msg => {
                    const msgTime = parseInt(msg.getAttribute('data-time'));
                    if (currentTime >= msgTime) {
                        if (!msg.classList.contains('active')) {
                            msg.classList.add('active');
                            // Скроллим транскрипт к активному сообщению
                            demoTranscript.scrollTo({
                                top: msg.offsetTop - demoTranscript.offsetTop - 40,
                                behavior: 'smooth'
                            });
                        }
                    }
                });

                // Поэтапно обновляем анализ ИИ под чек #4828
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

            }, 1000);
        }
    }

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

})();
