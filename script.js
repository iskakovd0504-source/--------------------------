/**
 * ОККМ Landing Page — Interactive Script
 */
(function () {
    'use strict';

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

            // Collect form data
            const templateParams = {
                from_name: document.getElementById('form-name').value,
                phone: document.getElementById('form-phone').value,
                company: document.getElementById('form-company').value,
                industry: document.getElementById('form-industry').value,
            };

            // Visual feedback — loading
            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="spin">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="10" stroke-linecap="round"/>
                </svg>
                Отправка...
            `;
            submitBtn.disabled = true;

            // Check if EmailJS is configured
            if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
                // Demo mode — simulate sending
                console.warn('EmailJS не настроен. Работает в демо-режиме. Данные формы:', templateParams);
                setTimeout(() => {
                    showSuccess(submitBtn, originalHTML);
                }, 1500);
                return;
            }

            // Real EmailJS send
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                .then(() => {
                    showSuccess(submitBtn, originalHTML);
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
            
            submitBtn.innerHTML = `
                Отправка...
            `;
            submitBtn.disabled = true;

            setTimeout(() => {
                submitBtn.innerHTML = "Заявка успешно отправлена! ✓";
                submitBtn.style.background = "#22c55e";
                submitBtn.style.borderColor = "#22c55e";
                
                tdForm.reset();
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.style.background = "";
                    submitBtn.style.borderColor = "";
                    submitBtn.disabled = false;
                }, 3000);
            }, 1500);
        });
    }

})();
