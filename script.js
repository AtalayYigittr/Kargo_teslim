document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const barcodeInput = document.getElementById('barcodeInput');
    const scanBtn = document.getElementById('scanBtn');
    const cargoList = document.getElementById('cargoList');
    const totalCount = document.getElementById('totalCount');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const adminPanel = document.getElementById('adminPanel');
    const addUserBtn = document.getElementById('addUserBtn');
    const usersList = document.getElementById('usersList');
    const userLogs = document.getElementById('userLogs');
    const endDaySection = document.querySelector('.end-day-section');
    const operatorName = document.getElementById('operatorName');
    const saveEndDay = document.getElementById('saveEndDay');
    const clearSignature = document.getElementById('clearSignature');
    const scannerContainer = document.getElementById('scanner-container');

    // Signature Pad initialization
    const signaturePad = new SignaturePad(document.getElementById('signaturePad'), {
        backgroundColor: 'rgb(255, 255, 255)'
    });

    // State
    let isAdmin = false;
    let todaysCargos = [];
    let scannedBarcodes = new Set();
    let isScanning = false;
    let currentUser = null;
    let loginTime = null;

    // Load data from localStorage
    function loadData() {
        const today = new Date().toLocaleDateString('tr-TR');
        todaysCargos = JSON.parse(localStorage.getItem(`cargos_${today}`)) || [];
        const history = JSON.parse(localStorage.getItem('scannedBarcodes')) || {};
        scannedBarcodes = new Set(history[today] || []);
        updateUI();
    }

    // Save data to localStorage
    function saveData() {
        const today = new Date().toLocaleDateString('tr-TR');
        localStorage.setItem(`cargos_${today}`, JSON.stringify(todaysCargos));
        const history = JSON.parse(localStorage.getItem('scannedBarcodes')) || {};
        history[today] = Array.from(scannedBarcodes);
        localStorage.setItem('scannedBarcodes', JSON.stringify(history));
    }

    // Update UI
    function updateUI() {
        cargoList.innerHTML = '';
        todaysCargos.forEach((cargo, index) => {
            const div = document.createElement('div');
            div.className = 'cargo-item';
            div.innerHTML = `
                <span>${cargo.barcode}</span>
                <span>${cargo.timestamp}</span>
                ${isAdmin ? `<button onclick="deleteCargo(${index})">Sil</button>` : ''}
            `;
            cargoList.appendChild(div);
        });
        totalCount.textContent = todaysCargos.length;

        // Admin panel updates
        if (currentUser && currentUser.role === 'admin') {
            adminPanel.style.display = 'block';
            updateUsersList();
            updateLogs();
        } else {
            adminPanel.style.display = 'none';
        }
    }

    // Check if barcode was scanned before
    function checkBarcode(barcode) {
        const history = JSON.parse(localStorage.getItem('scannedBarcodes')) || {};
        for (let date in history) {
            if (history[date].includes(barcode)) {
                const cargo = findCargoByBarcode(barcode, date);
                return { 
                    isScanned: true, 
                    date: date,
                    time: cargo ? cargo.timestamp : 'Zaman bilgisi bulunamadı'
                };
            }
        }
        return { isScanned: false };
    }

    // Find cargo by barcode
    function findCargoByBarcode(barcode, date) {
        const cargos = JSON.parse(localStorage.getItem(`cargos_${date}`)) || [];
        return cargos.find(cargo => cargo.barcode === barcode);
    }

    // Add new cargo
    function addCargo(barcode) {
        const check = checkBarcode(barcode);
        if (check.isScanned) {
            alert(`Bu barkod daha önce ${check.date} tarihinde ${check.time} saatinde tarandı!`);
            return;
        }

        const now = new Date();
        const cargo = {
            barcode: barcode,
            timestamp: now.toLocaleTimeString('tr-TR'),
            date: now.toLocaleDateString('tr-TR')
        };

        todaysCargos.push(cargo);
        scannedBarcodes.add(barcode);
        saveData();
        updateUI();
        barcodeInput.value = '';
        barcodeInput.focus();
    }

    // Handle barcode input
    barcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && barcodeInput.value.trim()) {
            addCargo(barcodeInput.value.trim());
        }
    });

    // Kullanıcı işlemleri
    function addUser(newUsername, newPassword, role) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.some(user => user.username === newUsername)) {
            alert('Bu kullanıcı adı zaten kullanımda!');
            return false;
        }
        
        users.push({
            username: newUsername,
            password: newPassword,
            role: role
        });
        
        localStorage.setItem('users', JSON.stringify(users));
        updateUsersList();
        return true;
    }

    function updateUsersList() {
        if (!currentUser || currentUser.role !== 'admin') return;
        
        const users = JSON.parse(localStorage.getItem('users')) || [];
        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    ${user.username}
                    <span class="user-role">(${user.role})</span>
                </div>
                ${user.username !== 'admin' ? `
                    <button onclick="deleteUser('${user.username}')">Sil</button>
                ` : ''}
            </div>
        `).join('');
    }

    // Kullanıcı silme
    window.deleteUser = (username) => {
        if (!currentUser || currentUser.role !== 'admin') return;
        
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const newUsers = users.filter(user => user.username !== username);
        localStorage.setItem('users', JSON.stringify(newUsers));
        updateUsersList();
    };

    // Log kayıtları
    function addLog(action, username) {
        const logs = JSON.parse(localStorage.getItem('userLogs')) || [];
        logs.unshift({
            timestamp: new Date().toLocaleString('tr-TR'),
            action: action,
            username: username
        });
        localStorage.setItem('userLogs', JSON.stringify(logs));
        updateLogs();
    }

    function updateLogs() {
        if (!currentUser || currentUser.role !== 'admin') return;
        
        const logs = JSON.parse(localStorage.getItem('userLogs')) || [];
        userLogs.innerHTML = logs.map(log => `
            <div class="log-item">
                <span class="timestamp">${log.timestamp}</span>
                <span class="username">${log.username}</span>
                <span class="action">${log.action}</span>
            </div>
        `).join('');
    }

    // Login işlemi
    function login(username, password) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = user;
            loginTime = new Date();
            addLog('Giriş yaptı', username);
            
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            username.style.display = 'none';
            password.style.display = 'none';
            
            if (user.role === 'admin') {
                adminPanel.style.display = 'block';
                updateUsersList();
                updateLogs();
            }
            
            return true;
        }
        
        return false;
    }

    // Logout işlemi
    function logout() {
        if (currentUser) {
            const duration = Math.round((new Date() - loginTime) / 1000 / 60); // dakika
            addLog(`Çıkış yaptı (${duration} dakika kaldı)`, currentUser.username);
        }
        
        currentUser = null;
        loginTime = null;
        adminPanel.style.display = 'none';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        username.style.display = 'block';
        password.style.display = 'block';
        username.value = '';
        password.value = '';
    }

    // Login functionality
    loginBtn.addEventListener('click', () => {
        if (login(username.value, password.value)) {
            updateUI();
        } else {
            alert('Hatalı kullanıcı adı veya şifre!');
        }
    });

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        logout();
        updateUI();
    });

    addUserBtn.addEventListener('click', () => {
        const newUsername = document.getElementById('newUsername').value;
        const newPassword = document.getElementById('newPassword').value;
        const role = document.getElementById('userRole').value;
        
        if (newUsername && newPassword) {
            if (addUser(newUsername, newPassword, role)) {
                addLog(`Yeni ${role} kullanıcı oluşturdu: ${newUsername}`, currentUser.username);
                document.getElementById('newUsername').value = '';
                document.getElementById('newPassword').value = '';
            }
        } else {
            alert('Kullanıcı adı ve şifre gerekli!');
        }
    });

    // Barcode scanner
    scanBtn.addEventListener('click', () => {
        if (isScanning) {
            Quagga.stop();
            scannerContainer.style.display = 'none';
            isScanning = false;
            scanBtn.textContent = 'Tara';
            return;
        }

        scannerContainer.style.display = 'block';
        isScanning = true;
        scanBtn.textContent = 'Kapat';

        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerContainer,
                constraints: {
                    facingMode: "environment"
                },
            },
            decoder: {
                readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"]
            }
        }, (err) => {
            if (err) {
                console.error(err);
                alert('Kamera başlatılamadı!');
                return;
            }
            Quagga.start();
        });
    });

    Quagga.onDetected((result) => {
        if (result.codeResult.code) {
            barcodeInput.value = result.codeResult.code;
            addCargo(result.codeResult.code);
            Quagga.stop();
            scannerContainer.style.display = 'none';
            isScanning = false;
            scanBtn.textContent = 'Tara';
        }
    });

    // End day functionality
    saveEndDay.addEventListener('click', () => {
        if (!operatorName.value.trim()) {
            alert('Lütfen mutabakat yapan kişi adını girin!');
            return;
        }

        if (signaturePad.isEmpty()) {
            alert('Lütfen imza atın!');
            return;
        }

        const today = new Date();
        const endDayRecord = {
            date: today.toLocaleDateString('tr-TR'),
            time: today.toLocaleTimeString('tr-TR'),
            operator: operatorName.value.trim(),
            totalCargos: todaysCargos.length,
            signature: signaturePad.toDataURL(),
            cargos: todaysCargos
        };

        const history = JSON.parse(localStorage.getItem('endDayHistory')) || [];
        history.unshift(endDayRecord);
        localStorage.setItem('endDayHistory', JSON.stringify(history));

        signaturePad.clear();
        operatorName.value = '';
        updateHistory();
        alert('Gün sonu kaydı başarıyla kaydedildi!');
    });

    clearSignature.addEventListener('click', () => {
        signaturePad.clear();
    });

    // Update history section
    function updateHistory() {
        const historyList = document.getElementById('historyList');
        const history = JSON.parse(localStorage.getItem('endDayHistory')) || [];

        historyList.innerHTML = history.map(record => `
            <div class="history-item">
                <h3>${record.date}</h3>
                <p>Saat: ${record.time}</p>
                <p>Mutabakat Yapan: ${record.operator}</p>
                <p>Toplam Kargo: ${record.totalCargos}</p>
                <img src="${record.signature}" alt="İmza">
                ${isAdmin ? '<button onclick="deleteHistory(\'' + record.date + '\')">Sil</button>' : ''}
            </div>
        `).join('');
    }

    // Delete history record (Admin only)
    window.deleteHistory = (date) => {
        if (!isAdmin) return;
        const history = JSON.parse(localStorage.getItem('endDayHistory')) || [];
        const newHistory = history.filter(record => record.date !== date);
        localStorage.setItem('endDayHistory', JSON.stringify(newHistory));
        updateHistory();
    };

    // Delete cargo (Admin only)
    window.deleteCargo = (index) => {
        if (!isAdmin) return;
        const barcode = todaysCargos[index].barcode;
        todaysCargos.splice(index, 1);
        scannedBarcodes.delete(barcode);
        saveData();
        updateUI();
    };

    // Initial load
    loadData();
    updateHistory();
});