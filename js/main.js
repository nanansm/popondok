
        window.addEventListener('load', function() {
            document.getElementById('app').style.visibility = 'visible';
            document.getElementById('app').style.opacity = '1';
        });

        document.addEventListener('DOMContentLoaded', function () {
            const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx1pBZpQatiIUsIz0y4JqbZjoGK6zXZAy692BM7ePIBz1MzA396xTxZv61Yo46WMe4w/exec";
            const NOMOR_ADMIN_WA = "628112131496";

            // All your existing JS logic remains the same
            const loaderOverlay = document.getElementById('loader-overlay');
            const calendarGrid = document.getElementById('calendar-grid');
            const monthYearEl = document.getElementById('month-year');
            const prevMonthBtn = document.getElementById('prev-month');
            const nextMonthBtn = document.getElementById('next-month');
            const checkinDateEl = document.getElementById('checkin-date');
            const checkoutDateEl = document.getElementById('checkout-date');
            const bookNowBtn = document.getElementById('book-now-btn');
            const bookingErrorEl = document.getElementById('booking-error');
            const homePage = document.getElementById('homePage');
            const checkoutPage = document.getElementById('checkoutPage');
            const confirmationPage = document.getElementById('confirmationPage');
            const backToHomeBtn = document.getElementById('back-to-home');
            const confirmWhatsappBtn = document.getElementById('confirm-whatsapp-btn');
            const checkoutForm = document.getElementById('checkout-form');
            const carousel = document.getElementById('image-carousel');
            const slides = carousel.querySelectorAll('.carousel-item');
            const prevSlideBtn = document.getElementById('prev-slide');
            const nextSlideBtn = document.getElementById('next-slide');
            let currentSlide = 0;
            let currentDate = new Date();
            let startDate = null;
            let endDate = null;
            let bookedDates = [];
            let lastBookingData = null;

            function showSlide(index) {
                slides.forEach((slide, i) => {
                    slide.classList.toggle('active', i === index);
                });
            }

            nextSlideBtn.addEventListener('click', () => {
                currentSlide = (currentSlide + 1) % slides.length;
                showSlide(currentSlide);
            });

            prevSlideBtn.addEventListener('click', () => {
                currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                showSlide(currentSlide);
            });
            
            setInterval(() => { nextSlideBtn.click(); }, 5000);

            async function fetchBookedDates() {
                showLoader();
                try {
                    const response = await fetch(SCRIPT_URL);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const data = await response.json();
                    if (data.status === "success") {
                        bookedDates = data.bookedDates;
                        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
                    } else {
                        throw new Error(data.message || "Gagal mengambil data ketersediaan.");
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                    alert(`Terjadi kesalahan: ${error.message}. Silakan muat ulang halaman.`);
                } finally {
                    hideLoader();
                }
            }

            function renderCalendar(year, month) {
                calendarGrid.innerHTML = '';
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                monthYearEl.textContent = new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                for (let i = 0; i < firstDay; i++) { calendarGrid.insertAdjacentHTML('beforeend', '<div></div>'); }
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const dateString = toYYYYMMDD(date);
                    const dayEl = document.createElement('div');
                    dayEl.textContent = day;
                    dayEl.classList.add('calendar-day');
                    dayEl.dataset.date = dateString;
                    if (date < new Date(new Date().toDateString())) {
                        dayEl.classList.add('disabled');
                    } else if (bookedDates.includes(dateString)) {
                        dayEl.classList.add('booked');
                    } else {
                        dayEl.addEventListener('click', () => handleDateClick(date));
                    }
                    calendarGrid.appendChild(dayEl);
                }
                updateCalendarSelection();
            }
            
            function handleDateClick(date) {
                bookingErrorEl.textContent = '';
                if (!startDate || (startDate && endDate)) {
                    startDate = date;
                    endDate = null;
                } else if (date > startDate) {
                    endDate = date;
                    if (isRangeBooked(startDate, endDate)) {
                        bookingErrorEl.textContent = 'Beberapa tanggal di rentang ini sudah penuh.';
                        startDate = null;
                        endDate = null;
                    }
                } else {
                    startDate = date;
                    endDate = null;
                }
                updateCalendarSelection();
            }

            function updateCalendarSelection() {
                const dayElements = document.querySelectorAll('.calendar-day');
                dayElements.forEach(el => {
                    el.classList.remove('selected', 'in-range');
                    if (!el.dataset.date) return;
                    const date = new Date(el.dataset.date + 'T00:00:00');
                    if (startDate && date.getTime() === startDate.getTime()) el.classList.add('selected');
                    if (endDate && date.getTime() === endDate.getTime()) el.classList.add('selected');
                    if (startDate && endDate && date > startDate && date < endDate) el.classList.add('in-range');
                });
                const options = { day: '2-digit', month: 'long', year: 'numeric' };
                checkinDateEl.textContent = startDate ? startDate.toLocaleDateString('id-ID', options) : '-';
                checkoutDateEl.textContent = endDate ? endDate.toLocaleDateString('id-ID', options) : '-';
                bookNowBtn.disabled = !(startDate && endDate);
            }

            async function handleCheckoutSubmit(e) {
                e.preventDefault();
                showLoader();
                const formData = new FormData(e.target);
                formData.append('checkin', toYYYYMMDD(startDate));
                formData.append('checkout', toYYYYMMDD(endDate));
                try {
                    const response = await fetch(SCRIPT_URL, {
                        method: 'POST',
                        body: formData,
                    });
                    const result = await response.json();
                    if (result.status !== 'success') {
                        throw new Error(result.message);
                    }
                    lastBookingData = formData;
                    showPage('confirmationPage', formData);
                    fetchBookedDates();
                } catch (error) {
                    alert(`Gagal mengirim reservasi: ${error.message}`);
                } finally {
                    hideLoader();
                }
            }

            const toYYYYMMDD = (date) => date.toISOString().split('T')[0];
            const isRangeBooked = (start, end) => {
                let current = new Date(start);
                while (current < end) {
                    if (bookedDates.includes(toYYYYMMDD(current))) return true;
                    current.setDate(current.getDate() + 1);
                }
                return false;
            };
            const showLoader = () => loaderOverlay.classList.remove('hidden');
            const hideLoader = () => loaderOverlay.classList.add('hidden');
            const resetState = () => {
                startDate = null;
                endDate = null;
                checkoutForm.reset();
                updateCalendarSelection();
            };
            
            function showPage(pageId, data = null) {
                homePage.classList.add('hidden');
                checkoutPage.classList.add('hidden');
                confirmationPage.classList.add('hidden');
                document.getElementById(pageId).classList.remove('hidden');
                const options = { day: '2-digit', month: 'long', year: 'numeric' };
                if (pageId === 'checkoutPage') {
                    document.getElementById('summary-checkin').textContent = startDate.toLocaleDateString('id-ID', options);
                    document.getElementById('summary-checkout').textContent = endDate.toLocaleDateString('id-ID', options);
                } else if (pageId === 'confirmationPage' && data) {
                    document.getElementById('confirm-name').textContent = data.get('nama');
                    document.getElementById('confirm-checkin').textContent = new Date(data.get('checkin')+'T00:00:00').toLocaleDateString('id-ID', options);
                    document.getElementById('confirm-checkout').textContent = new Date(data.get('checkout')+'T00:00:00').toLocaleDateString('id-ID', options);
                } else {
                    resetState();
                }
            }

            prevMonthBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
            });
            nextMonthBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
            });
            bookNowBtn.addEventListener('click', () => {
                if (startDate && endDate) showPage('checkoutPage');
            });
            backToHomeBtn.addEventListener('click', () => showPage('homePage'));
            
            confirmWhatsappBtn.addEventListener('click', () => {
                if (!lastBookingData) return;
                const options = { day: '2-digit', month: 'long', year: 'numeric' };
                const nama = lastBookingData.get('nama');
                const no_hp = lastBookingData.get('no_hp');
                const email = lastBookingData.get('email');
                const checkin = new Date(lastBookingData.get('checkin')+'T00:00:00').toLocaleDateString('id-ID', options);
                const checkout = new Date(lastBookingData.get('checkout')+'T00:00:00').toLocaleDateString('id-ID', options);
                const pesan = `Halo Popondok! Saya mau Booking kamar.\n\nAtas Nama : ${nama}\nNo HP : ${no_hp}\nEmail : ${email}\nCheck In : ${checkin}\nCheck Out : ${checkout}\n\nTolong Konfirmasi ketersediaan Kamarnya yah?`;
                const waLink = `https://api.whatsapp.com/send?phone=${NOMOR_ADMIN_WA}&text=${encodeURIComponent(pesan)}`;
                window.open(waLink, '_blank');
                showPage('homePage');
            });

            checkoutForm.addEventListener('submit', handleCheckoutSubmit);
            bookNowBtn.disabled = true;
            fetchBookedDates();
        });
    