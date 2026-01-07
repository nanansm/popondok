// --- Fungsi untuk memudarkan (fade in) aplikasi setelah semua konten dimuat ---
window.addEventListener('load', function() {
    const app = document.getElementById('app');
    if (app) {
        app.style.visibility = 'visible';
        app.style.opacity = '1';
    }
});

// --- Event listener utama yang berjalan setelah struktur HTML siap ---
document.addEventListener('DOMContentLoaded', function () {

    // ====================================================== //
    // KONSTANTA & VARIABEL GLOBAL
    // ====================================================== //
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwT2oKcg8Oks1Ct1zC99DrbQVAiVpNeVtf7aCBrbNWHnGLMEeWhk1_EWWTWUb7kL4oV/exec"; 
    const NOMOR_ADMIN_WA = "6281333311851";
    const TOTAL_CAMPS = 4; // Kapasitas maksimal unit Popondok

    let currentDate = new Date();
    let startDate = null;
    let endDate = null;
    let bookingCounts = {}; // Objek untuk menyimpan jumlah booking per tanggal dari Sheet
    let lastBookingData = null;

    const loaderOverlay = document.getElementById('loader-overlay');

    // ====================================================== //
    // LOGIKA MENU MOBILE
    // ====================================================== //
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isVisible = mobileMenu.style.display === 'flex';
            mobileMenu.style.display = isVisible ? 'none' : 'flex';
        });
        document.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', () => { mobileMenu.style.display = 'none'; });
        });
    }

    // ====================================================== //
    // LOGIKA FAQ ACCORDION
    // ====================================================== //
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(otherItem => otherItem.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            });
        });
    }

    // ====================================================== //
    // LOGIKA KALENDER & BOOKING
    // ====================================================== //
    const calendarGrid = document.getElementById('calendar-grid');

    if (calendarGrid) {
        const monthYearEl = document.getElementById('month-year');
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        const checkinDateEl = document.getElementById('checkin-date');
        const checkoutDateEl = document.getElementById('checkout-date');
        const bookNowBtn = document.getElementById('book-now-btn');
        const bookingErrorEl = document.getElementById('booking-error');
        const availabilityInfoEl = document.getElementById('availability-info');
        const homePage = document.getElementById('homePage');
        const checkoutPage = document.getElementById('checkoutPage');
        const confirmationPage = document.getElementById('confirmationPage');
        const backToHomeBtn = document.getElementById('back-to-home');
        const checkoutForm = document.getElementById('checkout-form');
        const confirmWhatsappBtn = document.getElementById('confirm-whatsapp-btn');
        
        // --- Fungsi Helper Tanggal ---
        const toYYYYMMDD = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const showLoader = () => loaderOverlay.classList.remove('hidden');
        const hideLoader = () => loaderOverlay.classList.add('hidden');
        
        // Logika pengecekan ketersediaan (Hanya cek malam menginap, checkout diabaikan)
        const isRangeBooked = (start, end) => {
            let current = new Date(start);
            while (current < end) { // "Strict <" agar pagi hari checkout tidak dihitung sebagai malam menginap
                const dateString = toYYYYMMDD(current);
                if ((bookingCounts[dateString] || 0) >= TOTAL_CAMPS) return true;
                current.setDate(current.getDate() + 1);
            }
            return false;
        };
        
        const resetState = () => {
            startDate = null;
            endDate = null;
            if (checkoutForm) checkoutForm.reset();
            updateCalendarSelection();
        };

        // --- Fetch Data dari Google Sheet ---
        async function fetchBookedDates() {
            showLoader();
            try {
                const response = await fetch(SCRIPT_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                if (data.status === "success") {
                    bookingCounts = data.bookingCounts;
                    renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
                } else {
                    throw new Error(data.message || "Gagal mengambil data ketersediaan.");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                alert(`Terjadi kesalahan saat memuat data ketersediaan: ${error.message}.`);
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
                
                const currentBookings = bookingCounts[dateString] || 0;
                
                if (date < new Date(new Date().toDateString())) {
                    dayEl.classList.add('disabled');
                } else if (currentBookings >= TOTAL_CAMPS) {
                    dayEl.classList.add('booked');
                } else {
                    dayEl.addEventListener('click', () => handleDateClick(date));
                }
                calendarGrid.appendChild(dayEl);
            }
            updateCalendarSelection();
        }
        
        function handleDateClick(date) {
            if (bookingErrorEl) bookingErrorEl.textContent = '';
            if (!startDate || (startDate && endDate)) {
                startDate = date;
                endDate = null;
            } else if (date > startDate) {
                endDate = date;
                if (isRangeBooked(startDate, endDate)) {
                    if (bookingErrorEl) bookingErrorEl.textContent = 'Maaf, di antara tanggal tersebut sudah penuh.';
                    startDate = null;
                    endDate = null;
                }
            } else {
                startDate = date;
                endDate = null;
            }
            updateCalendarSelection();
        }

        // --- Menampilkan Info Sisa Camp Terkecil dalam Rentang ---
        function updateAvailabilityDisplay() {
            if (!availabilityInfoEl) return;

            if (!startDate) {
                availabilityInfoEl.innerHTML = `<p style="color: var(--gray-500); font-size: 0.8rem;">Pilih tanggal check-in untuk melihat ketersediaan Camp.</p>`;
                return;
            }

            const startRange = new Date(startDate);
            const endRange = endDate ? new Date(endDate) : new Date(new Date(startDate).setDate(startDate.getDate() + 1));

            let minAvailable = TOTAL_CAMPS;
            let current = new Date(startRange);
            while (current < endRange) {
                const dateStr = toYYYYMMDD(current);
                const count = bookingCounts[dateStr] || 0;
                const available = TOTAL_CAMPS - count;
                if (available < minAvailable) minAvailable = available;
                current.setDate(current.getDate() + 1);
            }

            if (minAvailable <= 0) {
                availabilityInfoEl.innerHTML = `<span class="full">Penuh</span>`;
            } else if (minAvailable <= 2) {
                availabilityInfoEl.innerHTML = `Tersisa <span class="count limited">${minAvailable}</span> camp`;
            } else {
                availabilityInfoEl.innerHTML = `Tersedia <span class="count available">${minAvailable}</span> camp`;
            }
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
            if (checkinDateEl) checkinDateEl.textContent = startDate ? startDate.toLocaleDateString('id-ID', options) : '-';
            if (checkoutDateEl) checkoutDateEl.textContent = endDate ? endDate.toLocaleDateString('id-ID', options) : '-';
            if (bookNowBtn) bookNowBtn.disabled = !(startDate && endDate);

            updateAvailabilityDisplay();
        }

        function showPage(pageId, data = null) {
            if (homePage) homePage.classList.add('hidden');
            if (checkoutPage) checkoutPage.classList.add('hidden');
            if (confirmationPage) confirmationPage.classList.add('hidden');
            const pageToShow = document.getElementById(pageId);
            if(pageToShow) pageToShow.classList.remove('hidden');

            const options = { day: '2-digit', month: 'long', year: 'numeric' };
            if (pageId === 'checkoutPage') {
                document.getElementById('summary-checkin').textContent = startDate.toLocaleDateString('id-ID', options);
                document.getElementById('summary-checkout').textContent = endDate.toLocaleDateString('id-ID', options);
            } else if (pageId === 'confirmationPage' && data) {
                document.getElementById('confirm-name').textContent = data.get('nama');
                document.getElementById('confirm-checkin').textContent = new Date(data.get('checkin')+'T00:00:00').toLocaleDateString('id-ID', options);
                document.getElementById('confirm-checkout').textContent = new Date(data.get('checkout')+'T00:00:00').toLocaleDateString('id-ID', options);
            } else if (pageId === 'homePage') {
                resetState();
            }
        }
        
        async function handleCheckoutSubmit(e) {
            e.preventDefault();
            showLoader();
            const formData = new FormData(e.target);
            formData.append('checkin', toYYYYMMDD(startDate));
            formData.append('checkout', toYYYYMMDD(endDate));
            try {
                const response = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message || "Terjadi kesalahan server.");
                
                lastBookingData = formData;
                showPage('confirmationPage', formData);
                fetchBookedDates(); // Fetch ulang data (stok terbaru)
            } catch (error) {
                alert(`Gagal mengirim reservasi: ${error.message}`);
            } finally {
                hideLoader();
            }
        }
        
        // --- Event Listeners Navigasi ---
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        });
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        });

        if (bookNowBtn) { bookNowBtn.addEventListener('click', () => { if (startDate && endDate) showPage('checkoutPage'); }); }
        if (backToHomeBtn) { backToHomeBtn.addEventListener('click', () => showPage('homePage')); }
        if (checkoutForm) { checkoutForm.addEventListener('submit', handleCheckoutSubmit); }

        // --- WhatsApp Logic (Termasuk Dewasa, Anak, Lansia) ---
        if (confirmWhatsappBtn) {
            confirmWhatsappBtn.addEventListener('click', () => {
                if (!lastBookingData) return;
                const options = { day: '2-digit', month: 'long', year: 'numeric' };
                const nama = lastBookingData.get('nama');
                const no_hp = lastBookingData.get('no_hp');
                const email = lastBookingData.get('email');
                const checkin = new Date(lastBookingData.get('checkin')+'T00:00:00').toLocaleDateString('id-ID', options);
                const checkout = new Date(lastBookingData.get('checkout')+'T00:00:00').toLocaleDateString('id-ID', options);
                
                const dewasa = lastBookingData.get('dewasa');
                const anak = lastBookingData.get('anak');
                const lansia = lastBookingData.get('lansia');
                
                const pesan = `Halo Popondok!\n*Apakah masih Ready min? untuk pesanan dibawah ini :*\n\n*Detail Pemesan:*\nNama: ${nama}\nNo HP: ${no_hp}\nEmail: ${email}\n\n*Jadwal Menginap:*\nCheck In: ${checkin}\nCheck Out: ${checkout}\n\n*Jumlah Tamu:*\nDewasa: ${dewasa} orang\nAnak: ${anak} orang\nLansia: ${lansia} orang\n\n*Ketentuan:* \nCheck In Jam 15:00 WIB dan \nCheck Out Jam 12:00 WIB.\n\nTolong konfirmasi ketersediaan kamarnya, ya. Terima kasih!`;
        
                const waLink = `https://api.whatsapp.com/send?phone=${NOMOR_ADMIN_WA}&text=${encodeURIComponent(pesan)}`;
                window.open(waLink, '_blank');
                showPage('homePage');
            });
        }

        fetchBookedDates();
    }
});