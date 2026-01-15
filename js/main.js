/**
 * MAIN.JS UPDATED
 * Fitur: Baca Data Sheet (ON), Kirim Data Sheet (OFF/Manual via WA)
 */

// --- Fungsi untuk memudarkan (fade in) aplikasi setelah semua konten dimuat ---
window.addEventListener('load', function() {
    const app = document.getElementById('app');
    if (app) {
        app.style.visibility = 'visible';
        app.style.opacity = '1';
    }
});

document.addEventListener('DOMContentLoaded', function () {

    // ====================================================== //
    // KONFIGURASI
    // ====================================================== //
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLm5QpsIY-p2ttVlmWIqrIFzXNbjC5B7auvstO_ad1POQ77IepMjzL3VK8LQrKGVRA/exec"; 
    const NOMOR_ADMIN_WA = "6282343898807"; // Ganti dengan nomor WhatsApp admin Anda
    //const NOMOR_ADMIN_WA = "6281333311851"; // Ganti dengan nomor WhatsApp admin Anda
    const TOTAL_CAMPS = 4;

    let currentDate = new Date();
    let startDate = null;
    let endDate = null;
    let calendarData = {}; 
    let lastBookingData = null;

    const loaderOverlay = document.getElementById('loader-overlay');
    const calendarGrid = document.getElementById('calendar-grid');

    // --- Helper ---
    const toYYYYMMDD = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const showLoader = () => { if(loaderOverlay) loaderOverlay.classList.remove('hidden'); };
    const hideLoader = () => { if(loaderOverlay) loaderOverlay.classList.add('hidden'); };

    // ====================================================== //
    // 1. FETCH DATA (Hanya Membaca Ketersediaan & Harga)
    // ====================================================== //
    async function fetchBookedDates() {
        showLoader();
        try {
            // Kita hanya melakukan GET untuk membaca data
            const response = await fetch(SCRIPT_URL);
            const result = await response.json();
            
            if (result.status === "success") {
                calendarData = result.data;
                renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
            } else {
                console.error("API Error:", result.message);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            hideLoader();
        }
    }

    // ====================================================== //
    // 2. RENDER KALENDER
    // ====================================================== //
    function renderCalendar(year, month) {
        if (!calendarGrid) return;
        calendarGrid.innerHTML = '';
        
        const monthYearEl = document.getElementById('month-year');
        if(monthYearEl) monthYearEl.textContent = new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Format Harga: 850000 -> 850rb
        const formatPriceShort = (price) => {
            if (!price || price == 0) return '';
            if (price >= 1000000) return (price / 1000000).toFixed(1).replace('.0','') + 'jt';
            if (price >= 1000) return (price / 1000).toFixed(0) + 'rb';
            return price;
        };

        for (let i = 0; i < firstDay; i++) { 
            calendarGrid.insertAdjacentHTML('beforeend', '<div></div>'); 
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = toYYYYMMDD(date);
            
            const dayData = calendarData[dateString] || { booked: 0, price: 0 };
            const isFull = dayData.booked >= TOTAL_CAMPS;
            const priceText = formatPriceShort(dayData.price);

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day'; 
            
            let htmlContent = `<span class="day-number">${day}</span>`;
            if (priceText && !isFull) {
               // htmlContent += `<span class="day-price">${priceText}</span>`;
            } else if (isFull) {
                 // Opsional: Tampilkan teks Penuh
                 // htmlContent += `<span class="day-price" style="font-size:0.6rem;">Penuh</span>`; 
            }
            dayEl.innerHTML = htmlContent;

            // Logika Warna
            const isPast = date < new Date(new Date().setHours(0,0,0,0));
            if (isPast) {
                dayEl.classList.add('disabled');
            } else if (isFull) {
                dayEl.classList.add('booked'); 
            }
            
            dayEl.dataset.date = dateString;
            
            // Event Listener
            if (!isPast) {
                dayEl.addEventListener('click', () => handleDateClick(date, isFull));
            }
            
            calendarGrid.appendChild(dayEl);
        }
        updateCalendarSelection();
    }

    // ====================================================== //
    // 3. HANDLE KLIK TANGGAL
    // ====================================================== //
    function handleDateClick(date, isClickedDateFull) {
        const errEl = document.getElementById('booking-error');
        if (errEl) errEl.textContent = '';
        
        if (!startDate || (startDate && endDate)) {
            if (isClickedDateFull) {
                if (errEl) errEl.textContent = 'Tanggal Check-in tidak boleh penuh.';
                return; 
            }
            startDate = date;
            endDate = null;
        } else if (date > startDate) {
            // Validasi Range
            let valid = true;
            let curr = new Date(startDate);
            while(curr < date) { 
                const dStr = toYYYYMMDD(curr);
                if ((calendarData[dStr]?.booked || 0) >= TOTAL_CAMPS) { 
                    valid = false; 
                    break; 
                }
                curr.setDate(curr.getDate() + 1);
            }

            if (!valid) {
                if (errEl) errEl.textContent = 'Ada tanggal penuh di tengah durasi.';
                startDate = null; endDate = null;
            } else {
                endDate = date; 
            }
        } else {
            if (isClickedDateFull) { startDate = null; endDate = null; return; }
            startDate = date;
            endDate = null;
        }
        updateCalendarSelection();
    }

    // ====================================================== //
    // 4. UPDATE UI & TOTAL
    // ====================================================== //
    function updateCalendarSelection() {
        const els = document.querySelectorAll('.calendar-day');
        els.forEach(el => {
            el.classList.remove('selected', 'in-range');
            const dStr = el.dataset.date;
            if(!dStr) return;
            
            if (startDate && toYYYYMMDD(startDate) === dStr) el.classList.add('selected');
            if (endDate && toYYYYMMDD(endDate) === dStr) el.classList.add('selected');
            
            if (startDate && endDate) {
                const d = new Date(dStr);
                if (d > startDate && d < endDate) el.classList.add('in-range');
            }
        });

        const checkinEl = document.getElementById('checkin-date');
        const checkoutEl = document.getElementById('checkout-date');
        const btn = document.getElementById('book-now-btn');
        const availInfo = document.getElementById('availability-info');
        const totalEl = document.getElementById('summary-total');
        
        const fmt = { day: '2-digit', month: 'long', year: 'numeric' };
        if(checkinEl) checkinEl.textContent = startDate ? startDate.toLocaleDateString('id-ID', fmt) : '-';
        if(checkoutEl) checkoutEl.textContent = endDate ? endDate.toLocaleDateString('id-ID', fmt) : '-';
        if(btn) btn.disabled = !(startDate && endDate);

        // Hitung Total
        if (startDate) {
            let min = TOTAL_CAMPS;
            let totalRp = 0;
            let limit = endDate || new Date(new Date(startDate).getTime() + 86400000);
            let curr = new Date(startDate);
            
            while(curr < limit) {
                const dStr = toYYYYMMDD(curr);
                const data = calendarData[dStr] || {booked:0, price:0};
                const sisa = TOTAL_CAMPS - data.booked;
                if(sisa < min) min = sisa;
                totalRp += data.price;
                curr.setDate(curr.getDate()+1);
            }

            if (availInfo) {
                if (min <= 0) availInfo.innerHTML = '<span style="color:red;font-weight:bold;">Penuh</span>';
                else availInfo.innerHTML = `Tersedia <span style="font-weight:bold;">${min}</span> camp`;
            }
            if (totalEl) totalEl.textContent = 'Rp ' + totalRp.toLocaleString('id-ID');
        } else {
             if (availInfo) availInfo.innerHTML = '<p style="color:var(--gray-500);font-size:0.8rem;">Pilih tanggal check-in.</p>';
             if (totalEl) totalEl.textContent = 'Rp -';
        }
    }

    // ====================================================== //
    // 5. NAVIGASI HALAMAN
    // ====================================================== //
    const pages = ['homePage', 'checkoutPage', 'confirmationPage'];
    function showPage(id, data = null) {
        pages.forEach(p => document.getElementById(p).classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');

        if (id === 'checkoutPage') {
            const fmt = { day: '2-digit', month: 'long', year: 'numeric' };
            document.getElementById('summary-checkin').textContent = startDate.toLocaleDateString('id-ID', fmt);
            document.getElementById('summary-checkout').textContent = endDate.toLocaleDateString('id-ID', fmt);
        } 
        else if (id === 'confirmationPage' && data) {
            const fmt = { day: '2-digit', month: 'long', year: 'numeric' };
            document.getElementById('confirm-name').textContent = data.get('nama');
            document.getElementById('confirm-checkin').textContent = new Date(data.get('checkin')+'T00:00:00').toLocaleDateString('id-ID', fmt);
            document.getElementById('confirm-checkout').textContent = new Date(data.get('checkout')+'T00:00:00').toLocaleDateString('id-ID', fmt);
        }
        else if (id === 'homePage') {
            startDate = null; endDate = null; updateCalendarSelection();
        }
    }

    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if(prevBtn) prevBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(currentDate.getFullYear(), currentDate.getMonth()); });
    if(nextBtn) nextBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(currentDate.getFullYear(), currentDate.getMonth()); });

    const bookBtn = document.getElementById('book-now-btn');
    if(bookBtn) bookBtn.addEventListener('click', () => { if(startDate && endDate) showPage('checkoutPage'); });
    
    const backBtn = document.getElementById('back-to-home');
    if(backBtn) backBtn.addEventListener('click', () => showPage('homePage'));

    // ====================================================== //
    // 6. FORM SUBMIT (TANPA KIRIM KE SHEET)
    // ====================================================== //
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // showLoader(); // Tidak perlu loader karena tidak ada fetch

            // Ambil data form untuk persiapan WA
            const formData = new FormData(e.target);
            formData.append('checkin', toYYYYMMDD(startDate));
            formData.append('checkout', toYYYYMMDD(endDate));
            
            // Simpan data untuk tombol WA
            lastBookingData = formData;
            
            // Langsung tampilkan halaman sukses
            showPage('confirmationPage', formData);
        });
    }

    // ====================================================== //
    // 7. TOMBOL WHATSAPP
    // ====================================================== //
    const confirmWhatsappBtn = document.getElementById('confirm-whatsapp-btn');
    if (confirmWhatsappBtn) {
        confirmWhatsappBtn.addEventListener('click', () => {
            if (!lastBookingData) return;
            const fmt = { day: '2-digit', month: 'long', year: 'numeric' };
            const nama = lastBookingData.get('nama');
            const no_hp = lastBookingData.get('no_hp'); 
            const email = lastBookingData.get('email'); 
            const checkin = new Date(lastBookingData.get('checkin')+'T00:00:00').toLocaleDateString('id-ID', fmt);
            const checkout = new Date(lastBookingData.get('checkout')+'T00:00:00').toLocaleDateString('id-ID', fmt);
            
            // Ambil Total dari widget utama
            const totalEl = document.getElementById('summary-total');
            const totalText = totalEl ? totalEl.textContent : '-';
            
            // Detail Tamu
            const dewasa = lastBookingData.get('dewasa') || 0;
            const anak = lastBookingData.get('anak') || 0;
            const lansia = lastBookingData.get('lansia') || 0;

            const pesan = `Halo Popondok! 👋\nSaya ingin reservasi:\n\n*DATA PEMESAN:*\n👤 Nama: ${nama}\n📱 No HP: ${no_hp}\n📧 Email: ${email}\n\n*DETAIL RESERVASI:*\n📅 Check In: ${checkin}\n📅 Check Out: ${checkout}\n💰 *Total Estimasi:* ${totalText}\n👥 *Tamu:* ${dewasa} Dws, ${anak} Ank, ${lansia} Lan\n\nMohon info pembayaran. Terima kasih!`;
            
            const waLink = `https://api.whatsapp.com/send?phone=${NOMOR_ADMIN_WA}&text=${encodeURIComponent(pesan)}`;
            window.open(waLink, '_blank');
        });
    }

    // Init
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if(menuBtn) menuBtn.addEventListener('click', () => { menu.style.display = menu.style.display==='flex'?'none':'flex'; });

    document.querySelectorAll('.faq-question').forEach(b => {
        b.addEventListener('click', () => {
            const item = b.parentElement;
            const active = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            if(!active) item.classList.add('active');
        });
    });

    fetchBookedDates();
});