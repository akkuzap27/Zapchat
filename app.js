        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { initializeFirestore, getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy, onSnapshot, addDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

        const DB_NAME = "zapchat_cache";
        const STORE_NAME = "users";
        const CONV_STORE_NAME = "conversations";
        const SESSION_STORE_NAME = "session";
        let dbIDB = null;

        const VERIFIED_BADGE_HTML = `<span class="verified-badge" title="Verified Account"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 2.8 3.7-.4 1 3.5 3.3 1.8-1 3.5 1.8 3.3-2.8 2.4.4 3.7-3.5 1-1.8 3.3-3.5-1-3.3 1.8-2.4-2.8-3.7.4-1-3.5-3.3-1.8 1-3.5-1.8-3.3 2.8-2.4-.4-3.7 3.5-1 1.8-3.3 3.5 1z" fill="#4F46E5"/><path d="M9 12l2 2 4-4" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

        function openIndexedDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 4);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => { dbIDB = request.result; resolve(dbIDB); };
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "username" });
                    if (!db.objectStoreNames.contains(CONV_STORE_NAME)) db.createObjectStore(CONV_STORE_NAME, { keyPath: "id" });
                    if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) db.createObjectStore(SESSION_STORE_NAME, { keyPath: "key" });
                };
            });
        }

        async function saveSessionToIndexedDB(userData) {
            if (!dbIDB) await openIndexedDB();
            return new Promise((resolve) => {
                const transaction = dbIDB.transaction(SESSION_STORE_NAME, "readwrite");
                const store = transaction.objectStore(SESSION_STORE_NAME);
                store.put({ key: "current_user", data: userData });
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = () => resolve(false);
            });
        }

        async function getSessionFromIndexedDB() {
            if (!dbIDB) await openIndexedDB();
            return new Promise((resolve) => {
                const transaction = dbIDB.transaction(SESSION_STORE_NAME, "readonly");
                const store = transaction.objectStore(SESSION_STORE_NAME);
                const request = store.get("current_user");
                request.onsuccess = () => resolve(request.result ? request.result.data : null);
                request.onerror = () => resolve(null);
            });
        }

        async function clearSessionFromIndexedDB() {
            if (!dbIDB) await openIndexedDB();
            return new Promise((resolve) => {
                const transaction = dbIDB.transaction(SESSION_STORE_NAME, "readwrite");
                const store = transaction.objectStore(SESSION_STORE_NAME);
                store.delete("current_user");
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = () => resolve(false);
            });
        }

        async function saveUsersToIndexedDB(users) {
            if (!dbIDB) await openIndexedDB();
            const transaction = dbIDB.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            users.forEach(u => store.put(u));
        }

        async function getUsersFromIndexedDB() {
            if (!dbIDB) await openIndexedDB();
            return new Promise((resolve) => {
                const transaction = dbIDB.transaction(STORE_NAME, "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });
        }

        async function saveConversationsToIndexedDB(convs) {
            if (!dbIDB) await openIndexedDB();
            const transaction = dbIDB.transaction(CONV_STORE_NAME, "readwrite");
            const store = transaction.objectStore(CONV_STORE_NAME);
            convs.forEach(c => store.put(c));
        }

        async function getConversationsFromIndexedDB() {
            if (!dbIDB) await openIndexedDB();
            return new Promise((resolve) => {
                const transaction = dbIDB.transaction(CONV_STORE_NAME, "readonly");
                const store = transaction.objectStore(CONV_STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });
        }

        let deferredPrompt = null;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
        });

        document.getElementById("install-pwa-btn").addEventListener("click", async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt = null;
            } else {
                alert("ZAPCHAT is already installed or your browser requires manual installation.");
            }
        });

        document.getElementById("verify-account-btn").addEventListener("click", async () => {
            if (!currentUser) return;
            if (currentUser.username === 'zapchat_official') {
                alert("Official Admin account is already verified! ⚡");
                return;
            }
            if (currentUser.isVerified) {
                alert("Your account is already verified! ⚡");
                return;
            }
            const pwd = prompt("Enter premium upgrade password:");
            if (pwd === null) return;
            const validPwd = ADMIN_VERIFY_PWD;
            if (validPwd && pwd === validPwd) {
                currentUser.isVerified = true;
                try {
                    await updateDoc(doc(db, "users", currentUser.username), { isVerified: true });
                    await saveSessionToIndexedDB(currentUser);
                    alert("Congratulations! Your account is now verified! 🎉");
                    location.reload();
                } catch (err) {
                    alert("Verification failed.");
                }
            } else {
                alert("Incorrect password.");
            }
        });

        // Application Configuration: Supports local config.js overrides with automatic fallback for deployments
        const DEFAULT_CONFIG = {
            firebase: {
                apiKey: "AIzaSyBXc1fJyqo6BSj30Vv-axprkY2ULBHyWkY",
                authDomain: "zapchat-591ed.firebaseapp.com",
                projectId: "zapchat-591ed",
                storageBucket: "zapchat-591ed.firebasestorage.app",
                messagingSenderId: "611183131307",
                appId: "1:611183131307:web:1dd87df6f0938c9fa7d5ee",
                measurementId: "G-DGVWEZWF66"
            },
            imgbbApiKey: "374b4f518dad39ead177ba0e4b4a38f5",
            adminVerificationPassword: "zap260116"
        };

        const loadedConfig = window.APP_CONFIG || {};
        const firebaseConfig = (loadedConfig.firebase && loadedConfig.firebase.apiKey && !loadedConfig.firebase.apiKey.startsWith("YOUR_"))
            ? loadedConfig.firebase
            : DEFAULT_CONFIG.firebase;

        const IMGBB_API_KEY = (loadedConfig.imgbbApiKey && !loadedConfig.imgbbApiKey.startsWith("YOUR_"))
            ? loadedConfig.imgbbApiKey
            : DEFAULT_CONFIG.imgbbApiKey;

        const ADMIN_VERIFY_PWD = loadedConfig.adminVerificationPassword || DEFAULT_CONFIG.adminVerificationPassword;

        const app = initializeApp(firebaseConfig);
        let analytics = null;
        try {
            analytics = getAnalytics(app);
        } catch (e) {
            console.warn("Analytics not initialized:", e);
        }
        let db;
        try {
            db = initializeFirestore(app, {
                experimentalAutoDetectLongPolling: true,
                useFetchStreams: false
            });
        } catch (e) {
            db = getFirestore(app);
        }
        
        // Safe Avatar Renderer with graceful fallback if 503 or broken URL
        function getAvatarHtml(photoUrl, name, sizeClass = "avatar-sm") {
            const cleanName = (name || "?").replace(/^@/, "");
            const initial = cleanName.charAt(0).toUpperCase() || "?";
            if (!photoUrl) {
                return `<div class="${sizeClass}">${initial}</div>`;
            }
            return `
                <div class="${sizeClass}" style="position:relative; overflow:hidden;">
                    <img src="${photoUrl}" alt="${cleanName}" loading="lazy"
                         style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;"
                         onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
                    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:600;background:var(--accent-light);color:var(--accent-primary);">${initial}</span>
                </div>
            `;
        }

        document.querySelectorAll(".toggle-password").forEach(btn => {
            btn.addEventListener("click", () => {
                const input = document.getElementById(btn.getAttribute("data-target"));
                input.type = input.type === "password" ? "text" : "password";
            });
        });

        document.getElementById("show-register").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("login-form").classList.add("hidden");
            document.getElementById("register-form").classList.remove("hidden");
        });
        document.getElementById("show-login").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("register-form").classList.add("hidden");
            document.getElementById("login-form").classList.remove("hidden");
        });

        document.getElementById("register-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const errEl = document.getElementById("reg-error");
            errEl.textContent = "";
            if (!navigator.onLine) { errEl.textContent = "You are currently offline. Please connect to the internet to register."; return; }
            const username = document.getElementById("reg-username").value.trim().toLowerCase();
            const password = document.getElementById("reg-password").value;
            const confirmPassword = document.getElementById("reg-confirm-password").value;

            if (username.length < 3) { errEl.textContent = "Username must be at least 3 characters."; return; }
            if (password !== confirmPassword) { errEl.textContent = "Passwords do not match."; return; }

            try {
                await openIndexedDB();
                const userRef = doc(db, "users", username);
                const snap = await getDoc(userRef);
                if (snap.exists()) { errEl.textContent = "Username already taken."; return; }

                const isOfficialAdmin = (username === 'zapchat_official');
                const userData = {
                    uid: "user_" + Date.now(),
                    username,
                    password,
                    displayName: username,
                    bio: isOfficialAdmin ? "Official ZapChat Administration Account ⚡" : "Hey there! I'm using ZAPCHAT ⚡",
                    photoURL: "",
                    isVerified: isOfficialAdmin ? true : false,
                    createdAt: new Date(),
                    lastSeen: new Date()
                };

                await setDoc(userRef, userData);
                await saveSessionToIndexedDB(userData);
                initApp(userData);
            } catch (err) {
                console.error("Registration failed:", err);
                errEl.textContent = err.message ? `Registration failed: ${err.message}` : "Registration failed. Please check your internet connection.";
            }
        });

        document.getElementById("login-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const errEl = document.getElementById("login-error");
            errEl.textContent = "";
            if (!navigator.onLine) { errEl.textContent = "You are currently offline. Please connect to the internet to log in."; return; }
            const username = document.getElementById("login-username").value.trim().toLowerCase();
            const password = document.getElementById("login-password").value;

            if (!username || !password) {
                errEl.textContent = "Please enter both username and password.";
                return;
            }

            try {
                await openIndexedDB();
                const userRef = doc(db, "users", username);
                const snap = await getDoc(userRef);
                if (!snap.exists()) { 
                    errEl.textContent = "Username not found. Please click 'Create Account' to register."; 
                    return; 
                }
                
                const userData = snap.data();
                if (userData.password !== password) { errEl.textContent = "Incorrect password."; return; }

                await saveSessionToIndexedDB(userData);
                initApp(userData);
            } catch (err) {
                console.error("Login failed:", err);
                errEl.textContent = err.message ? `Login failed: ${err.message}` : "Login failed. Please check your internet connection.";
            }
        });

        document.getElementById("logout-btn").addEventListener("click", async () => {
            await clearSessionFromIndexedDB();
            location.reload();
        });

        document.getElementById("delete-my-account-btn").addEventListener("click", async () => {
            if (!currentUser) return;
            if (currentUser.username === 'zapchat_official') {
                alert("Admin account cannot be deleted.");
                return;
            }
            if (confirm("Are you sure you want to delete your account? This action is irreversible.")) {
                try {
                    await deleteDoc(doc(db, "users", currentUser.username));
                    await clearSessionFromIndexedDB();
                    alert("Account successfully deleted.");
                    location.reload();
                } catch (err) {
                    alert("Failed to delete account.");
                }
            }
        });

        window.switchView = (id) => {
            document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
            document.getElementById(id).classList.add("active");
            document.querySelectorAll(".sidebar-nav-links li, .mobile-bottom-nav button").forEach(n => {
                n.classList.toggle("active", n.getAttribute("data-target") === id);
            });
            document.getElementById("chat-screen")?.classList.add("hidden");
            document.getElementById("app-container")?.classList.remove("in-chat");
            document.body.classList.remove("in-chat");
            const mobNav = document.getElementById("mobile-bottom-nav");
            if (mobNav && window.innerWidth <= 768) {
                mobNav.style.setProperty("display", "flex", "important");
            }
            if (id === 'friends-view') fetchAllUsers();
        };

        document.querySelectorAll(".sidebar-nav-links li, .mobile-bottom-nav button").forEach(item => {
            item.addEventListener("click", () => {
                const target = item.getAttribute("data-target");
                if (target) switchView(target);
            });
        });
        document.getElementById("global-search-btn").addEventListener("click", () => switchView("friends-view"));
        document.getElementById("settings-menu-btn").addEventListener("click", () => switchView("settings-view"));

        let currentUser = null;
        let allUsersCache = [];
        let allConversationsCache = [];
        let uploadedPhotoURL = "";
        let presenceInterval = null;

        document.getElementById("upload-avatar-btn").addEventListener("click", () => {
            document.getElementById("avatar-file-input").click();
        });

        document.getElementById("avatar-file-input").addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const statusEl = document.getElementById("upload-status");
            if (!IMGBB_API_KEY) { statusEl.textContent = "Upload failed: ImgBB API key not configured in config.js."; return; }
            statusEl.textContent = "Uploading image...";

            const formData = new FormData();
            formData.append("image", file);

            try {
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`, { method: "POST", body: formData });
                const data = await response.json();
                if (data.success) {
                    uploadedPhotoURL = data.data.url;
                    const displayEl = document.getElementById("profile-avatar-display");
                    displayEl.style.backgroundImage = `url('${uploadedPhotoURL}')`;
                    displayEl.textContent = "";
                    statusEl.textContent = "Upload successful! Click Save Changes.";
                } else {
                    statusEl.textContent = "Upload failed.";
                }
            } catch (err) {
                statusEl.textContent = "Upload error.";
            }
        });

        window.addEventListener("DOMContentLoaded", async () => {
            try {
                await openIndexedDB();
                const sessionUser = await getSessionFromIndexedDB();
                if (sessionUser) {
                    initApp(sessionUser);
                } else {
                    checkUrlForSurvey();
                }
            } catch (e) {
                checkUrlForSurvey();
            }
        });

        async function initApp(user) {
            currentUser = user;
            await openIndexedDB();
            document.getElementById("auth-container").classList.add("hidden");
            document.getElementById("app-container").classList.remove("hidden");

            if (user.username === 'zapchat_official') {
                document.getElementById("admin-settings-section").classList.remove("hidden");
            }

            document.getElementById("profile-username").value = user.username;
            document.getElementById("profile-display-name").value = user.displayName || "";
            document.getElementById("profile-bio").value = user.bio || "";
            document.getElementById("profile-created-at").value = user.createdAt ? new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString() : "Recently";
            
            uploadedPhotoURL = user.photoURL || "";
            const displayEl = document.getElementById("profile-avatar-display");
            const headerAvatar = document.getElementById("header-avatar");

            if (uploadedPhotoURL) {
                displayEl.style.backgroundImage = `url('${uploadedPhotoURL}')`;
                displayEl.textContent = "";
                headerAvatar.style.backgroundImage = `url('${uploadedPhotoURL}')`;
                headerAvatar.textContent = "";
            } else {
                displayEl.textContent = user.username.charAt(0).toUpperCase();
                headerAvatar.textContent = user.username.charAt(0).toUpperCase();
            }

            await fetchAllUsers();

            const cachedConvs = await getConversationsFromIndexedDB();
            if (cachedConvs && cachedConvs.length > 0) {
                allConversationsCache = cachedConvs;
                renderConversationsList(cachedConvs, user.username);
            }

            async function updatePresence() {
                try {
                    await updateDoc(doc(db, "users", currentUser.username), { lastSeen: new Date() });
                } catch (e) {}
            }
            updatePresence();
            if (presenceInterval) clearInterval(presenceInterval);
            presenceInterval = setInterval(updatePresence, 15000);

            document.getElementById("save-profile-btn").onclick = async () => {
                const newName = document.getElementById("profile-display-name").value.trim();
                const newBio = document.getElementById("profile-bio").value.trim();

                currentUser.displayName = newName;
                currentUser.bio = newBio;
                currentUser.photoURL = uploadedPhotoURL;

                await updateDoc(doc(db, "users", user.username), { 
                    displayName: newName, 
                    bio: newBio,
                    photoURL: uploadedPhotoURL
                });

                await saveSessionToIndexedDB(currentUser);
                if (uploadedPhotoURL) {
                    headerAvatar.style.backgroundImage = `url('${uploadedPhotoURL}')`;
                    headerAvatar.textContent = "";
                }
                alert("Profile updated successfully!");
                location.reload();
            };

            const convsQuery = query(collection(db, "conversations"), where("participantUsernames", "array-contains", user.username));
            onSnapshot(convsQuery, async (snapshot) => {
                const convs = [];
                snapshot.forEach(d => {
                    convs.push({ id: d.id, ...d.data() });
                });
                convs.sort((a, b) => {
                    const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
                    const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
                    return tB - tA;
                });

                await saveConversationsToIndexedDB(convs);
                allConversationsCache = convs;
                renderConversationsList(convs, user.username);
            });

            checkUrlForSurvey();
        }

        document.getElementById("admin-send-broadcast-btn")?.addEventListener("click", async () => {
            const text = document.getElementById("admin-broadcast-input").value.trim();
            if (!text) return;
            try {
                await addDoc(collection(db, "broadcasts"), {
                    message: text,
                    createdAt: new Date(),
                    sender: "zapchat_official"
                });
                document.getElementById("admin-broadcast-input").value = "";
                alert("Broadcast sent to all users!");
            } catch (err) {
                alert("Failed to send broadcast.");
            }
        });

        document.getElementById("admin-execute-delete-btn")?.addEventListener("click", async () => {
            const target = document.getElementById("admin-delete-username").value.trim().toLowerCase();
            if (!target) return;
            if (target === 'zapchat_official') { alert("Cannot delete official admin account."); return; }
            if (confirm(`Terminate user @${target}?`)) {
                try {
                    await deleteDoc(doc(db, "users", target));
                    document.getElementById("admin-delete-username").value = "";
                    alert(`User @${target} terminated successfully.`);
                } catch (err) {
                    alert("User deletion failed.");
                }
            }
        });

        async function renderConversationsList(convs, currentUsername) {
            const list = document.getElementById("conversations-list");
            list.innerHTML = "";
            if (!convs || convs.length === 0) {
                document.getElementById("chats-empty-state").classList.remove("hidden");
                return;
            }
            document.getElementById("chats-empty-state").classList.add("hidden");
            
            const cachedUsers = await getUsersFromIndexedDB();

            for (const conv of convs) {
                const card = document.createElement("div");
                card.className = "conversation-card";

                let title = "";
                let avatarHtml = "";
                let otherUsername = "";
                let isOtherVerified = false;

                if (conv.isGroup) {
                    title = conv.groupName;
                    avatarHtml = `<div class="avatar-sm">👥</div>`;
                    card.onclick = () => openGroupChat(conv.id);
                } else {
                    otherUsername = conv.participantUsernames.find(u => u !== currentUsername);
                    if (!otherUsername) continue;

                    let foundUser = allUsersCache.find(u => u.username === otherUsername);
                    if (!foundUser) {
                        foundUser = cachedUsers.find(u => u.username === otherUsername);
                    }
                    const isDeletedUser = !foundUser;

                    isOtherVerified = foundUser?.isVerified || false;
                    title = isDeletedUser ? `@${otherUsername} [Deleted Account]` : `@${otherUsername}`;
                    const otherPhoto = foundUser?.photoURL || "";

                    avatarHtml = getAvatarHtml(otherPhoto, otherUsername, "avatar-sm");

                    card.onclick = () => openChat(conv.id, otherUsername, otherPhoto, isOtherVerified, isDeletedUser);
                }

                const unreadMap = conv.unreadBy || {};
                const isUnread = unreadMap[currentUsername] === true;

                card.innerHTML = `
                    ${avatarHtml}
                    <div class="conv-info">
                        <div class="conv-header-row">
                            <span class="conv-username">${title} ${(!conv.isGroup && isOtherVerified) ? VERIFIED_BADGE_HTML : ''} ${isUnread ? '<span class="unread-dot"></span>' : ''}</span>
                        </div>
                        <div class="conv-preview">${conv.lastMessagePreview || 'No messages yet'}</div>
                    </div>
                `;
                list.appendChild(card);
            }
        }

        document.getElementById("fab-group-btn").addEventListener("click", async () => {
            const container = document.getElementById("group-members-checkboxes");
            container.innerHTML = "";
            allUsersCache.forEach(u => {
                if (u.username === currentUser.username) return;
                const div = document.createElement("label");
                div.style.display = "flex";
                div.style.alignItems = "center";
                div.style.gap = "8px";
                div.style.fontSize = "13px";
                div.style.cursor = "pointer";
                div.innerHTML = `<input type="checkbox" value="${u.username}" class="group-member-chk"> @${u.username}`;
                container.appendChild(div);
            });
            document.getElementById("group-modal").classList.remove("hidden");
        });

        document.getElementById("close-group-modal").addEventListener("click", () => {
            document.getElementById("group-modal").classList.add("hidden");
        });

        document.getElementById("submit-create-group-btn").addEventListener("click", async () => {
            const groupName = document.getElementById("group-name-input").value.trim();
            const groupDesc = document.getElementById("group-desc-input").value.trim();
            if (!groupName) { alert("Please enter a group name."); return; }

            const checkboxes = document.querySelectorAll(".group-member-chk:checked");
            const members = [currentUser.username];
            checkboxes.forEach(chk => members.push(chk.value));

            try {
                await addDoc(collection(db, "conversations"), {
                    isGroup: true,
                    groupName,
                    groupDesc,
                    participantUsernames: members,
                    admins: [currentUser.username],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastMessagePreview: "Group created",
                    unreadBy: {},
                    seenBy: {}
                });
                document.getElementById("group-modal").classList.add("hidden");
                alert("Group created successfully!");
            } catch (err) {
                alert("Failed to create group.");
            }
        });

        async function fetchAllUsers() {
            try {
                const snap = await getDocs(collection(db, "users"));
                allUsersCache = [];
                snap.forEach(d => allUsersCache.push(d.data()));
                await saveUsersToIndexedDB(allUsersCache);
                renderUserList(allUsersCache);
            } catch (err) {
                document.getElementById("offline-banner").classList.remove("hidden");
                allUsersCache = await getUsersFromIndexedDB();
                renderUserList(allUsersCache);
            }
        }

        function renderUserList(users) {
            const list = document.getElementById("search-results-list");
            list.innerHTML = "";
            let found = false;

            users.forEach(u => {
                if (currentUser && u.username === currentUser.username) return;
                found = true;
                const card = document.createElement("div");
                card.className = "user-card";
                
                const avatarHtml = getAvatarHtml(u.photoURL, u.username, "avatar-sm");

                card.innerHTML = `
                    <div class="user-card-info" onclick="showUserProfile('${u.username}')">
                        ${avatarHtml}
                        <div class="user-card-details"><h4>@${u.username} ${u.isVerified ? VERIFIED_BADGE_HTML : ''}</h4><p>${u.displayName || u.username}</p></div>
                    </div>
                    <button class="btn primary-btn-sm" onclick="startChatWith('${u.username}')">Message</button>
                `;
                list.appendChild(card);
            });

            if (!found) list.innerHTML = "<p>No other accounts found.</p>";
        }

        document.getElementById("user-search-input").addEventListener("input", (e) => {
            const term = e.target.value.trim().toLowerCase();
            if (!term) { renderUserList(allUsersCache); return; }
            renderUserList(allUsersCache.filter(u => u.username.toLowerCase().includes(term)));
        });

        window.showUserProfile = async (username) => {
            let user = allUsersCache.find(u => u.username === username);
            if (!user) {
                const cached = await getUsersFromIndexedDB();
                user = cached.find(u => u.username === username);
            }
            if (!user) return;

            const modalAvatar = document.getElementById("modal-avatar");
            if (user.photoURL) {
                modalAvatar.style.backgroundImage = `url('${user.photoURL}')`;
                modalAvatar.textContent = "";
            } else {
                modalAvatar.style.backgroundImage = "";
                modalAvatar.textContent = user.username.charAt(0).toUpperCase();
            }

            document.getElementById("modal-username").innerHTML = `@${user.username} ${user.isVerified ? VERIFIED_BADGE_HTML : ''}`;
            document.getElementById("modal-display-name").textContent = user.displayName || user.username;
            document.getElementById("modal-bio").textContent = user.bio || "No bio available.";
            document.getElementById("modal-joined").textContent = user.createdAt ? `Joined: ${new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString()}` : "";
            
            document.getElementById("modal-chat-btn").onclick = () => {
                document.getElementById("profile-modal").classList.add("hidden");
                startChatWith(user.username);
            };

            document.getElementById("profile-modal").classList.remove("hidden");
        };

        document.getElementById("close-profile-modal").addEventListener("click", () => {
            document.getElementById("profile-modal").classList.add("hidden");
        });

        window.startChatWith = async (targetUsername) => {
            const convsRef = collection(db, "conversations");
            const q = query(convsRef, where("participantUsernames", "array-contains", currentUser.username));
            const snap = await getDocs(q);
            let convId = null;
            let targetPhoto = "";
            let targetIsVerified = false;
            
            const targetSnap = allUsersCache.find(u => u.username === targetUsername);
            if (targetSnap) {
                targetPhoto = targetSnap.photoURL || "";
                targetIsVerified = targetSnap.isVerified || false;
            }

            snap.forEach(d => {
                const data = d.data();
                if (!data.isGroup && data.participantUsernames.includes(targetUsername)) convId = d.id;
            });

            if (!convId) {
                const newConv = await addDoc(convsRef, {
                    isGroup: false,
                    participantUsernames: [currentUser.username, targetUsername],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastMessagePreview: "Started conversation",
                    unreadBy: {},
                    seenBy: {}
                });
                convId = newConv.id;
            }
            openChat(convId, targetUsername, targetPhoto, targetIsVerified, false);
            switchView('chats-view');
        };

        let activeConvId = null;
        let activeIsGroup = false;
        let msgUnsub = null;
        let presenceUnsub = null;
        let convUnsub = null;
        let replyingToMsg = null;

        window.openChat = async (convId, friendUsername, friendPhoto = "", friendIsVerified = false, isDeletedUser = false) => {
            activeConvId = convId;
            activeIsGroup = false;
            document.getElementById("fab-group-btn").classList.add("hidden");
            document.getElementById("group-settings-btn").classList.add("hidden");
            document.getElementById("chat-friend-username").innerHTML = `@${friendUsername} ${isDeletedUser ? '[Deleted Account]' : (friendIsVerified ? VERIFIED_BADGE_HTML : '')}`;
            document.getElementById("chat-friend-username").onclick = isDeletedUser ? null : () => showUserProfile(friendUsername);
            
            const chatAvatar = document.getElementById("chat-friend-avatar");
            chatAvatar.onclick = isDeletedUser ? null : () => showUserProfile(friendUsername);
            chatAvatar.innerHTML = "";
            chatAvatar.style.backgroundImage = "";
            if (friendPhoto) {
                const img = document.createElement("img");
                img.src = friendPhoto;
                img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;top:0;left:0;";
                img.onerror = () => {
                    img.remove();
                    chatAvatar.textContent = friendUsername.charAt(0).toUpperCase();
                };
                chatAvatar.style.position = "relative";
                chatAvatar.style.overflow = "hidden";
                chatAvatar.appendChild(img);
            } else {
                chatAvatar.textContent = friendUsername.charAt(0).toUpperCase();
            }

            document.getElementById("app-container").classList.add("in-chat");
            document.body.classList.add("in-chat");
            const mobNav = document.getElementById("mobile-bottom-nav");
            if (mobNav) mobNav.style.setProperty("display", "none", "important");

            if (window.innerWidth <= 768) {
                document.getElementById("desktop-sidebar").style.display = "none";
            } else {
                document.getElementById("desktop-sidebar").style.display = "flex";
            }
            document.getElementById("chat-screen").classList.remove("hidden");

            markChatAsSeen(convId, friendUsername);
            setupChatListeners(convId, friendUsername);
        };

        window.openGroupChat = async (convId) => {
            activeConvId = convId;
            activeIsGroup = true;
            document.getElementById("fab-group-btn").classList.add("hidden");
            document.getElementById("group-settings-btn").classList.remove("hidden");

            const convRef = doc(db, "conversations", convId);
            const convSnap = await getDoc(convRef);
            const groupData = convSnap.data();

            document.getElementById("chat-friend-username").innerHTML = `👥 ${groupData.groupName}`;
            document.getElementById("chat-friend-username").onclick = () => openGroupSettings(convId, groupData);
            
            const chatAvatar = document.getElementById("chat-friend-avatar");
            chatAvatar.style.backgroundImage = "";
            chatAvatar.textContent = "👥";
            chatAvatar.onclick = () => openGroupSettings(convId, groupData);

            document.getElementById("app-container").classList.add("in-chat");
            document.body.classList.add("in-chat");
            const mobNav = document.getElementById("mobile-bottom-nav");
            if (mobNav) mobNav.style.setProperty("display", "none", "important");

            if (window.innerWidth <= 768) {
                document.getElementById("desktop-sidebar").style.display = "none";
            } else {
                document.getElementById("desktop-sidebar").style.display = "flex";
            }
            document.getElementById("chat-screen").classList.remove("hidden");

            document.getElementById("group-settings-btn").onclick = () => openGroupSettings(convId, groupData);

            markChatAsSeen(convId, null);
            setupChatListeners(convId, null);
        };

        async function markChatAsSeen(convId, friendUsername) {
            try {
                const convRef = doc(db, "conversations", convId);
                const convSnap = await getDoc(convRef);
                if (convSnap.exists()) {
                    const data = convSnap.data();
                    const unreadBy = data.unreadBy || {};
                    const seenBy = data.seenBy || {};
                    let needsUpdate = false;
                    
                    if (unreadBy[currentUser.username]) {
                        unreadBy[currentUser.username] = false;
                        needsUpdate = true;
                    }
                    if (!seenBy[currentUser.username]) {
                        seenBy[currentUser.username] = true;
                        needsUpdate = true;
                    }
                    if (needsUpdate) {
                        await updateDoc(convRef, { unreadBy, seenBy });
                    }
                }
            } catch (e) {}
        }

        function setupChatListeners(convId, friendUsername) {
            if (!activeIsGroup && friendUsername) {
                if (presenceUnsub) presenceUnsub();
                presenceUnsub = onSnapshot(doc(db, "users", friendUsername), (userSnap) => {
                    const statusEl = document.getElementById("chat-status-text");
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        const lastSeen = data.lastSeen?.toDate ? data.lastSeen.toDate() : (data.lastSeen?.seconds ? new Date(data.lastSeen.seconds * 1000) : new Date(0));
                        const diffSeconds = (Date.now() - lastSeen.getTime()) / 1000;
                        if (diffSeconds < 30) {
                            statusEl.textContent = "Active";
                            statusEl.className = "status-indicator online";
                        } else {
                            statusEl.textContent = "Offline";
                            statusEl.className = "status-indicator";
                        }
                    } else {
                        statusEl.textContent = "Offline";
                        statusEl.className = "status-indicator";
                    }
                });
            } else {
                document.getElementById("chat-status-text").textContent = "Group Chat";
                document.getElementById("chat-status-text").className = "status-indicator online";
            }

            if (convUnsub) convUnsub();
            convUnsub = onSnapshot(doc(db, "conversations", convId), async (convSnap) => {
                if (convSnap.exists()) {
                    const data = convSnap.data();
                    const seenBy = data.seenBy || {};
                    
                    document.querySelectorAll(".message-bubble.sent .seen-status").forEach(el => {
                        let isSeenAny = false;
                        if (activeIsGroup) {
                            isSeenAny = Object.keys(seenBy).some(u => u !== currentUser.username && seenBy[u] === true);
                        } else {
                            isSeenAny = seenBy[friendUsername] === true;
                        }

                        el.textContent = isSeenAny ? "Seen ✓✓" : "✓✓";
                        if (isSeenAny) el.style.color = "var(--purple-primary)";
                    });
                }
            });

            if (msgUnsub) msgUnsub();
            const msgCont = document.getElementById("messages-container");
            const msgQuery = query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc"));
            
            msgUnsub = onSnapshot(msgQuery, async (snap) => {
                msgCont.innerHTML = "";
                if (snap.empty) {
                    msgCont.innerHTML = "<p style='text-align:center; color:var(--text-secondary); margin-top:30px;'>Start the conversation! ⚡</p>";
                    return;
                }

                const convRef = doc(db, "conversations", convId);
                const convSnap = await getDoc(convRef);
                const seenBy = convSnap.exists() ? (convSnap.data().seenBy || {}) : {};

                snap.forEach(d => {
                    const m = d.data();
                    const isSent = m.senderUsername === currentUser.username;
                    
                    const row = document.createElement("div");
                    row.className = `message-row ${isSent ? 'sent' : 'received'}`;

                    const bubble = document.createElement("div");
                    bubble.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
                    
                    const timeStr = m.createdAt ? new Date(m.createdAt.toDate ? m.createdAt.toDate() : m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                    
                    let isSeenAny = false;
                    if (activeIsGroup) {
                        isSeenAny = Object.keys(seenBy).some(u => u !== currentUser.username && seenBy[u] === true);
                    } else {
                        isSeenAny = seenBy[friendUsername] === true;
                    }
                    const seenStatusHtml = isSent ? `<span class="seen-status" style="${isSeenAny ? 'color:var(--purple-primary); font-weight:700;' : ''}">${isSeenAny ? 'Seen ✓✓' : '✓✓'}</span>` : '';

                    let senderNameHtml = (activeIsGroup && !isSent) ? `<div class="msg-sender-name">@${m.senderUsername}</div>` : '';
                    
                    let replyBoxHtml = '';
                    if (m.replyTo) {
                        replyBoxHtml = `<div class="reply-content-box"><b>@${m.replyTo.sender}</b>: ${m.replyTo.text}</div>`;
                    }

                    let reactionsHtml = '';
                    if (m.reactions && Object.keys(m.reactions).length > 0) {
                        let rxCounts = {};
                        Object.values(m.reactions).forEach(emoji => {
                            rxCounts[emoji] = (rxCounts[emoji] || 0) + 1;
                        });
                        let badgeStr = Object.entries(rxCounts).map(([em, cnt]) => `${em} ${cnt > 1 ? cnt : ''}`).join(' ');
                        reactionsHtml = `<div class="message-reactions-badge">${badgeStr}</div>`;
                    }

                    const forwardedHtml = m.forwardedFrom ? `<div class="forward-indicator"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>Forwarded from @${m.forwardedFrom}</div>` : '';

                    if (m.type === 'voice') {
                        bubble.innerHTML = `
                            ${forwardedHtml} ${senderNameHtml} ${replyBoxHtml}
                            <div class="voice-message-player" data-audio="${m.audioUrl}">
                                <button type="button" class="voice-play-btn" title="Play Voice Note">
                                    <svg class="play-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    <svg class="pause-icon hidden" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                </button>
                                <div class="voice-track-wrapper">
                                    <div class="voice-progress-track">
                                        <div class="voice-progress-bar" style="width: 0%;"></div>
                                    </div>
                                    <div class="voice-time-label">
                                        <span class="curr-time">0:00</span>
                                        <span class="total-time">${m.duration || '0:00'}</span>
                                    </div>
                                </div>
                                <audio src="${m.audioUrl}" preload="metadata" style="display:none;"></audio>
                            </div>
                            <div class="message-meta">${timeStr} ${seenStatusHtml}</div> ${reactionsHtml}
                        `;
                        setupVoicePlayer(bubble.querySelector(".voice-message-player"));
                    } else if (m.type === 'survey') {
                        const surveyUrl = `${window.location.origin}${window.location.pathname}?survey=${m.surveyId}`;
                        bubble.innerHTML = `
                            ${forwardedHtml} ${senderNameHtml} ${replyBoxHtml}
                            <div class="survey-bubble-card">
                                <div class="survey-bubble-title">📊 Survey: ${m.question}</div>
                                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">${m.options.length} options available.</div>
                                <a href="${surveyUrl}" target="_blank" class="survey-link-tag">Open Survey & Vote ➔</a>
                            </div>
                            <div class="message-meta">${timeStr} ${seenStatusHtml}</div> ${reactionsHtml}
                        `;
                    } else if (m.type === 'image') {
                        bubble.innerHTML = `
                            ${forwardedHtml} ${senderNameHtml} ${replyBoxHtml}
                            <img src="${m.imageUrl}" class="chat-image" loading="lazy"
                                 onerror="this.style.display='none'; this.nextElementSibling?.classList.remove('hidden');"
                                 onclick="openImageViewer('${m.imageUrl}')">
                            <div class="img-error-fallback hidden" style="padding:14px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:10px;text-align:center;color:#64748B;font-size:12px;margin:4px 0;">
                                <div style="font-size:16px;margin-bottom:2px;">🖼️</div>
                                <div style="font-weight:600;">Image unavailable</div>
                                <div style="font-size:11px;color:#94A3B8;">(Network / Hosting 503)</div>
                            </div>
                            <div class="message-meta">${timeStr} ${seenStatusHtml}</div> ${reactionsHtml}
                        `;
                    } else if (m.type === 'sticker') {
                        bubble.innerHTML = `
                            ${forwardedHtml} ${senderNameHtml} ${replyBoxHtml}
                            <img src="${m.stickerUrl}" class="chat-sticker">
                            <div class="message-meta">${timeStr} ${seenStatusHtml}</div> ${reactionsHtml}
                        `;
                    } else {
                        bubble.innerHTML = `
                            ${forwardedHtml} ${senderNameHtml} ${replyBoxHtml}
                            <div>${m.text}</div>
                            <div class="message-meta">${timeStr} ${seenStatusHtml}</div> ${reactionsHtml}
                        `;
                    }

                    let msgTimer;
                    bubble.addEventListener("mousedown", (e) => {
                        msgTimer = setTimeout(() => showMessageContextMenu(e, d.id, isSent, m), 600);
                    });
                    bubble.addEventListener("mouseup", () => clearTimeout(msgTimer));
                    bubble.addEventListener("touchstart", (e) => {
                        msgTimer = setTimeout(() => showMessageContextMenu(e, d.id, isSent, m), 600);
                    });
                    bubble.addEventListener("touchend", () => clearTimeout(msgTimer));
                    bubble.addEventListener("contextmenu", (e) => {
                        e.preventDefault();
                        showMessageContextMenu(e, d.id, isSent, m);
                    });

                    const forwardBtn = document.createElement("button");
                    forwardBtn.type = "button";
                    forwardBtn.className = "msg-forward-btn";
                    forwardBtn.title = "Forward Message";
                    forwardBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>`;
                    forwardBtn.onclick = (e) => {
                        e.stopPropagation();
                        window.openForwardModal(d.id, m);
                    };

                    if (isSent) {
                        row.appendChild(forwardBtn);
                        row.appendChild(bubble);
                    } else {
                        row.appendChild(bubble);
                        row.appendChild(forwardBtn);
                    }
                    msgCont.appendChild(row);
                });
                msgCont.scrollTop = msgCont.scrollHeight;
            });
        }

        function showMessageContextMenu(e, msgId, isSent, messageData) {
            e.stopPropagation();
            const existing = document.getElementById("floating-context-menu");
            if (existing) existing.remove();

            const menu = document.createElement("div");
            menu.id = "floating-context-menu";
            menu.className = "context-action-menu";
            menu.style.top = `${e.clientY || e.touches?.[0].clientY || 100}px`;
            menu.style.left = `${e.clientX || e.touches?.[0].clientX || 100}px`;

            const reactionBar = document.createElement("div");
            reactionBar.className = "reaction-popup";
            ['❤️', '👍', '😂', '😮', '😢', '🙏'].forEach(emoji => {
                const btn = document.createElement("button");
                btn.className = "reaction-emoji-btn";
                btn.textContent = emoji;
                btn.onclick = async () => {
                    menu.remove();
                    try {
                        const msgRef = doc(db, "conversations", activeConvId, "messages", msgId);
                        const currentReactions = messageData.reactions || {};
                        currentReactions[currentUser.username] = emoji;
                        await updateDoc(msgRef, { reactions: currentReactions });
                    } catch(err){}
                };
                reactionBar.appendChild(btn);
            });
            menu.appendChild(reactionBar);

            const replyBtn = document.createElement("button");
            replyBtn.className = "context-action-item";
            replyBtn.style.color = "var(--purple-primary)";
            replyBtn.textContent = "Reply";
            replyBtn.onclick = () => {
                menu.remove();
                setReplyToMessage(messageData);
            };
            menu.appendChild(replyBtn);

            const forwardCtxBtn = document.createElement("button");
            forwardCtxBtn.className = "context-action-item";
            forwardCtxBtn.style.color = "var(--text-primary)";
            forwardCtxBtn.textContent = "Forward ↗️";
            forwardCtxBtn.onclick = () => {
                menu.remove();
                window.openForwardModal(msgId, messageData);
            };
            menu.appendChild(forwardCtxBtn);

            if (isSent) {
                const delBtn = document.createElement("button");
                delBtn.className = "context-action-item";
                delBtn.textContent = "Delete for Everyone";
                delBtn.onclick = async () => {
                    menu.remove();
                    try {
                        await deleteDoc(doc(db, "conversations", activeConvId, "messages", msgId));
                    } catch (err) {
                        alert("Failed to delete message.");
                    }
                };
                menu.appendChild(delBtn);
            }

            document.body.appendChild(menu);
            setTimeout(() => {
                window.addEventListener("click", () => menu.remove(), { once: true });
            }, 100);
        }

        function setReplyToMessage(msg) {
            replyingToMsg = {
                sender: msg.senderUsername,
                text: msg.text || (msg.type === 'image' ? 'Photo' : (msg.type === 'sticker' ? 'Sticker' : 'Survey'))
            };
            document.getElementById("reply-preview-sender").textContent = `Replying to @${replyingToMsg.sender}`;
            document.getElementById("reply-preview-text").textContent = replyingToMsg.text;
            document.getElementById("reply-preview-bar").classList.remove("hidden");
            document.getElementById("message-input").focus();
        }

        window.cancelReply = () => {
            replyingToMsg = null;
            document.getElementById("reply-preview-bar").classList.add("hidden");
        };

        async function openGroupSettings(convId, groupData) {
            document.getElementById("gs-name-input").value = groupData.groupName || "";
            document.getElementById("gs-desc-input").value = groupData.groupDesc || "";
            
            const membersListDiv = document.getElementById("gs-members-list");
            membersListDiv.innerHTML = "";

            const isAdmin = groupData.admins?.includes(currentUser.username);

            groupData.participantUsernames.forEach(member => {
                const isMemberAdmin = groupData.admins?.includes(member);
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.justifyContent = "space-between";
                row.style.alignItems = "center";
                row.style.fontSize = "13px";
                row.innerHTML = `
                    <span>@${member} ${isMemberAdmin ? '<b>(Admin)</b>' : ''}</span>
                    <div>
                        ${isAdmin && !isMemberAdmin ? `<button class="secondary-btn-sm" onclick="makeGroupAdmin('${convId}', '${member}')">Make Admin</button>` : ''}
                        ${isAdmin && member !== currentUser.username ? `<button class="danger-btn-sm" style="padding:4px 8px; font-size:11px;" onclick="removeGroupMember('${convId}', '${member}')">Remove</button>` : ''}
                    </div>
                `;
                membersListDiv.appendChild(row);
            });

            document.getElementById("gs-save-btn").onclick = async () => {
                const newName = document.getElementById("gs-name-input").value.trim();
                const newDesc = document.getElementById("gs-desc-input").value.trim();
                if (!newName) return;
                await updateDoc(doc(db, "conversations", convId), { groupName: newName, groupDesc: newDesc });
                alert("Group settings updated!");
                document.getElementById("group-settings-modal").classList.add("hidden");
            };

            document.getElementById("gs-exit-btn").onclick = async () => {
                if (confirm("Are you sure you want to leave this group?")) {
                    await updateDoc(doc(db, "conversations", convId), {
                        participantUsernames: arrayRemove(currentUser.username)
                    });
                    document.getElementById("group-settings-modal").classList.add("hidden");
                    document.getElementById("close-chat-btn").click();
                }
            };

            document.getElementById("group-settings-modal").classList.remove("hidden");
        }

        window.makeGroupAdmin = async (convId, username) => {
            const ref = doc(db, "conversations", convId);
            await updateDoc(ref, { admins: arrayUnion(username) });
            alert(`@${username} is now an admin.`);
            document.getElementById("group-settings-modal").classList.add("hidden");
        };

        window.removeGroupMember = async (convId, username) => {
            const ref = doc(db, "conversations", convId);
            await updateDoc(ref, { participantUsernames: arrayRemove(username) });
            alert(`@${username} removed from group.`);
            document.getElementById("group-settings-modal").classList.add("hidden");
        };

        document.getElementById("close-group-settings-modal").addEventListener("click", () => {
            document.getElementById("group-settings-modal").classList.add("hidden");
        });

        let myStickers = JSON.parse(localStorage.getItem("zapchat_stickers") || "[]");

        function renderMyStickers() {
            const grid = document.getElementById("my-stickers-grid");
            grid.innerHTML = "";
            if (myStickers.length === 0) {
                grid.innerHTML = "<p style='font-size:12px; color:var(--text-secondary); grid-column:span 3;'>No custom stickers yet. Upload one!</p>";
                return;
            }
            myStickers.forEach((url, idx) => {
                const img = document.createElement("img");
                img.src = url;
                img.className = "sticker-item";
                img.onclick = () => {
                    sendStickerMessage(url);
                    document.getElementById("sticker-modal").classList.add("hidden");
                };
                grid.appendChild(img);
            });
        }

        document.getElementById("menu-sticker-btn").addEventListener("click", () => {
            attachMenu.classList.add("hidden");
            renderMyStickers();
            document.getElementById("sticker-modal").classList.remove("hidden");
        });

        document.getElementById("close-sticker-modal").addEventListener("click", () => {
            document.getElementById("sticker-modal").classList.add("hidden");
        });

        document.getElementById("sticker-file-input").addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const statusEl = document.getElementById("sticker-upload-status");
            if (!IMGBB_API_KEY) { statusEl.textContent = "Upload failed: ImgBB API key not configured in config.js."; return; }
            statusEl.textContent = "Uploading sticker...";

            const formData = new FormData();
            formData.append("image", file);

            try {
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`, { method: "POST", body: formData });
                const data = await response.json();
                if (data.success) {
                    const stickerUrl = data.data.url;
                    myStickers.push(stickerUrl);
                    localStorage.setItem("zapchat_stickers", JSON.stringify(myStickers));
                    statusEl.textContent = "Sticker added successfully!";
                    renderMyStickers();
                } else {
                    statusEl.textContent = "Upload failed.";
                }
            } catch (err) {
                statusEl.textContent = "Upload error.";
            }
        });

        async function sendStickerMessage(stickerUrl) {
            if (!activeConvId) return;
            await addDoc(collection(db, "conversations", activeConvId, "messages"), {
                senderUsername: currentUser.username,
                type: "sticker",
                stickerUrl,
                replyTo: replyingToMsg,
                createdAt: new Date()
            });
            cancelReply();
            updateConversationPreview(activeConvId, "📍 Sticker");
        }

        let currentZoom = 1;
        const viewerModal = document.getElementById("image-viewer-modal");
        const viewerImg = document.getElementById("viewer-image");

        function openImageViewer(url) {
            currentZoom = 1;
            viewerImg.style.transform = `scale(${currentZoom})`;
            viewerImg.src = url;
            viewerModal.classList.remove("hidden");
        }

        document.getElementById("viewer-close").onclick = () => viewerModal.classList.add("hidden");
        document.getElementById("viewer-zoom-in").onclick = () => {
            currentZoom = Math.min(currentZoom + 0.5, 4);
            viewerImg.style.transform = `scale(${currentZoom})`;
        };
        document.getElementById("viewer-zoom-out").onclick = () => {
            currentZoom = Math.max(currentZoom - 0.5, 1);
            viewerImg.style.transform = `scale(${currentZoom})`;
        };
        document.getElementById("viewer-download").onclick = async () => {
            const url = viewerImg.src;
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = `zapchat_image_${Date.now()}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            } catch (err) {
                window.open(url, "_blank");
            }
        };

        let isDragging = false, startX, startY, translateX = 0, translateY = 0;
        viewerImg.onmousedown = (e) => {
            if (currentZoom > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                e.preventDefault();
            }
        };
        window.onmousemove = (e) => {
            if (!isDragging) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            viewerImg.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
        };
        window.onmouseup = () => { isDragging = false; };

        document.getElementById("close-chat-btn").addEventListener("click", async () => {
            document.getElementById("chat-screen").classList.add("hidden");
            document.getElementById("app-container").classList.remove("in-chat");
            document.body.classList.remove("in-chat");
            const mobNav = document.getElementById("mobile-bottom-nav");
            if (mobNav) {
                if (window.innerWidth <= 768) {
                    mobNav.style.setProperty("display", "flex", "important");
                } else {
                    mobNav.style.display = "none";
                }
            }
            if (window.innerWidth <= 768) {
                document.getElementById("desktop-sidebar").style.display = "none";
            } else {
                document.getElementById("desktop-sidebar").style.display = "flex";
            }
            document.getElementById("fab-group-btn").classList.remove("hidden");
            if (msgUnsub) msgUnsub();
            if (presenceUnsub) presenceUnsub();
            if (convUnsub) convUnsub();
            activeConvId = null;
        });

        document.getElementById("clear-chat-btn").addEventListener("click", async () => {
            if (!activeConvId) return;
            if (confirm("Are you sure you want to clear this conversation?")) {
                const msgSnap = await getDocs(collection(db, "conversations", activeConvId, "messages"));
                const batchDeletions = msgSnap.docs.map(d => deleteDoc(d.ref));
                await Promise.all(batchDeletions);
                await updateDoc(doc(db, "conversations", activeConvId), { lastMessagePreview: "Conversation cleared", updatedAt: new Date() });
            }
        });

        const plusBtn = document.getElementById("composer-plus-btn");
        const attachMenu = document.getElementById("attachment-menu");

        plusBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            attachMenu.classList.toggle("hidden");
        });
        document.addEventListener("click", () => attachMenu.classList.add("hidden"));

        document.getElementById("menu-image-btn").addEventListener("click", () => {
            attachMenu.classList.add("hidden");
            document.getElementById("chat-image-file-input").click();
        });

        document.getElementById("chat-image-file-input").addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file || !activeConvId) return;
            if (!IMGBB_API_KEY) { alert("Image upload failed: ImgBB API key not configured in config.js."); return; }

            const formData = new FormData();
            formData.append("image", file);

            try {
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`, { method: "POST", body: formData });
                const data = await response.json();
                if (data.success) {
                    const imageUrl = data.data.url;
                    await addDoc(collection(db, "conversations", activeConvId, "messages"), {
                        senderUsername: currentUser.username,
                        type: "image",
                        imageUrl,
                        replyTo: replyingToMsg,
                        createdAt: new Date()
                    });
                    cancelReply();
                    updateConversationPreview(activeConvId, "📷 Photo");
                } else {
                    alert("Image upload failed.");
                }
            } catch (err) {
                alert("Image upload error.");
            }
        });

        document.getElementById("menu-survey-btn").addEventListener("click", () => {
            attachMenu.classList.add("hidden");
            document.getElementById("survey-question-input").value = "";
            document.getElementById("survey-options-container").innerHTML = `
                <input type="text" class="survey-option-input" placeholder="Option 1">
                <input type="text" class="survey-option-input" placeholder="Option 2">
            `;
            document.getElementById("survey-modal").classList.remove("hidden");
        });

        document.getElementById("close-survey-modal").addEventListener("click", () => {
            document.getElementById("survey-modal").classList.add("hidden");
        });

        document.getElementById("add-survey-option-btn").addEventListener("click", () => {
            const container = document.getElementById("survey-options-container");
            const count = container.children.length + 1;
            const input = document.createElement("input");
            input.type = "text";
            input.className = "survey-option-input";
            input.placeholder = `Option ${count}`;
            container.appendChild(input);
        });

        document.getElementById("publish-survey-btn").addEventListener("click", async () => {
            const question = document.getElementById("survey-question-input").value.trim();
            const optionInputs = document.querySelectorAll(".survey-option-input");
            const options = [];
            optionInputs.forEach(inp => { if (inp.value.trim()) options.push(inp.value.trim()); });

            if (!question) { alert("Please enter a survey question."); return; }
            if (options.length < 2) { alert("Please provide at least 2 options."); return; }

            try {
                const surveyRef = await addDoc(collection(db, "surveys"), {
                    question, options, votes: {}, createdAt: new Date(), creator: currentUser.username
                });

                await addDoc(collection(db, "conversations", activeConvId, "messages"), {
                    senderUsername: currentUser.username,
                    type: "survey",
                    surveyId: surveyRef.id,
                    question,
                    options,
                    text: `📊 Survey: ${question}`,
                    replyTo: replyingToMsg,
                    createdAt: new Date()
                });
                cancelReply();
                updateConversationPreview(activeConvId, `📊 Survey: ${question}`);
                document.getElementById("survey-modal").classList.add("hidden");
            } catch (err) {
                alert("Failed to publish survey.");
            }
        });

        document.getElementById("send-message-btn").addEventListener("click", sendMsg);
        document.getElementById("message-input").addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
        });

        async function sendMsg() {
            const input = document.getElementById("message-input");
            const text = input.value.trim();
            if (!text || !activeConvId) return;
            input.value = "";

            await addDoc(collection(db, "conversations", activeConvId, "messages"), {
                senderUsername: currentUser.username,
                text,
                replyTo: replyingToMsg,
                createdAt: new Date()
            });

            cancelReply();
            updateConversationPreview(activeConvId, text);
        }

        async function updateConversationPreview(convId, previewText) {
            const convRef = doc(db, "conversations", convId);
            const convSnap = await getDoc(convRef);
            let unreadBy = {};
            let seenBy = {};
            if (convSnap.exists()) {
                const participants = convSnap.data().participantUsernames || [];
                unreadBy = convSnap.data().unreadBy || {};
                seenBy = convSnap.data().seenBy || {};
                participants.forEach(u => {
                    if (u !== currentUser.username) {
                        unreadBy[u] = true;
                        seenBy[u] = false;
                    }
                });
            }

            await updateDoc(convRef, {
                updatedAt: new Date(),
                lastMessagePreview: previewText,
                unreadBy,
                seenBy
            });
        }

// Check URL for public survey query (?survey=ID)
async function checkUrlForSurvey() {
    try {
        const params = new URLSearchParams(window.location.search);
        const surveyId = params.get("survey");
        if (!surveyId) return;

        const overlay = document.getElementById("public-survey-overlay");
        const content = document.getElementById("public-survey-content");
        if (!overlay || !content) return;

        overlay.classList.remove("hidden");
        content.innerHTML = "<p style='text-align:center;color:#64748b;'>Loading survey...</p>";

        const surveyRef = doc(db, "surveys", surveyId);
        const snap = await getDoc(surveyRef);
        if (!snap.exists()) {
            content.innerHTML = `
                <h3 style="color:#ef4444;margin-bottom:8px;">Survey Not Found</h3>
                <p style="color:#64748b;font-size:14px;">This survey might have been deleted or the link is invalid.</p>
                <button class="btn secondary-btn" style="margin-top:16px;" onclick="document.getElementById('public-survey-overlay').classList.add('hidden')">Close</button>
            `;
            return;
        }

        const surveyData = snap.data();
        const votes = surveyData.votes || {};
        const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

        function renderSurveyUI(voted = false) {
            let optionsHtml = "";
            (surveyData.options || []).forEach((opt, idx) => {
                const count = votes[idx] || 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                if (voted) {
                    optionsHtml += `
                        <div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:500;margin-bottom:4px;">
                                <span>${opt}</span>
                                <span>${pct}% (${count})</span>
                            </div>
                            <div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                                <div style="height:100%;width:${pct}%;background:#4f46e5;border-radius:999px;"></div>
                            </div>
                        </div>
                    `;
                } else {
                    optionsHtml += `
                        <button class="btn secondary-btn survey-vote-btn" data-index="${idx}" style="display:block;width:100%;margin-bottom:8px;text-align:left;padding:12px 16px;">
                            ${opt}
                        </button>
                    `;
                }
            });

            content.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <span style="font-size:12px;font-weight:600;color:#4f46e5;text-transform:uppercase;letter-spacing:0.05em;">📊 Public Survey</span>
                    <button class="btn" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748b;" onclick="document.getElementById('public-survey-overlay').classList.add('hidden')">✕</button>
                </div>
                <h3 style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:16px;">${surveyData.question}</h3>
                <div id="survey-options-list">${optionsHtml}</div>
                <div style="margin-top:16px;font-size:12px;color:#64748b;text-align:right;">Total votes: ${totalVotes}</div>
            `;

            if (!voted) {
                content.querySelectorAll(".survey-vote-btn").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        const idx = btn.getAttribute("data-index");
                        const newVotes = { ...votes, [idx]: (votes[idx] || 0) + 1 };
                        try {
                            await updateDoc(surveyRef, { votes: newVotes });
                            votes[idx] = (votes[idx] || 0) + 1;
                            renderSurveyUI(true);
                        } catch (err) {
                            alert("Failed to submit vote.");
                        }
                    });
                });
            }
        }

        renderSurveyUI(false);
    } catch (e) {
        console.warn("Survey check error:", e);
    }
}
window.checkUrlForSurvey = checkUrlForSurvey;

// Online / Offline Network Monitoring
function updateNetworkStatus() {
    let banner = document.getElementById("offline-status-banner");
    if (!navigator.onLine) {
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "offline-status-banner";
            banner.style.cssText = "position:fixed;top:0;left:0;right:0;background:#ef4444;color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
            banner.innerHTML = "⚠️ You are currently offline. Please check your internet connection.";
            document.body.prepend(banner);
        }
    } else {
        if (banner) banner.remove();
    }
}
window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateNetworkStatus);
} else {
    updateNetworkStatus();
}


        // --- Voice Player Functionality ---
        let currentActiveAudio = null;
        let currentActivePlayBtn = null;

        function setupVoicePlayer(playerEl) {
            if (!playerEl) return;
            const audio = playerEl.querySelector("audio");
            const playBtn = playerEl.querySelector(".voice-play-btn");
            const playIcon = playBtn.querySelector(".play-icon");
            const pauseIcon = playBtn.querySelector(".pause-icon");
            const progressBar = playerEl.querySelector(".voice-progress-bar");
            const progressTrack = playerEl.querySelector(".voice-progress-track");
            const currTimeLabel = playerEl.querySelector(".curr-time");
            const totalTimeLabel = playerEl.querySelector(".total-time");

            function formatTime(sec) {
                if (isNaN(sec) || !isFinite(sec)) return "0:00";
                const m = Math.floor(sec / 60);
                const s = Math.floor(sec % 60);
                return `${m}:${s < 10 ? '0' : ''}${s}`;
            }

            audio.addEventListener("loadedmetadata", () => {
                if (audio.duration && isFinite(audio.duration)) {
                    totalTimeLabel.textContent = formatTime(audio.duration);
                }
            });

            audio.addEventListener("timeupdate", () => {
                if (audio.duration) {
                    const pct = (audio.currentTime / audio.duration) * 100;
                    progressBar.style.width = `${pct}%`;
                    currTimeLabel.textContent = formatTime(audio.currentTime);
                }
            });

            audio.addEventListener("ended", () => {
                playIcon.classList.remove("hidden");
                pauseIcon.classList.add("hidden");
                progressBar.style.width = "0%";
                currTimeLabel.textContent = "0:00";
                currentActiveAudio = null;
                currentActivePlayBtn = null;
            });

            audio.addEventListener("pause", () => {
                playIcon.classList.remove("hidden");
                pauseIcon.classList.add("hidden");
            });

            audio.addEventListener("play", () => {
                if (currentActiveAudio && currentActiveAudio !== audio) {
                    currentActiveAudio.pause();
                    currentActiveAudio.currentTime = 0;
                    if (currentActivePlayBtn) {
                        currentActivePlayBtn.querySelector(".play-icon")?.classList.remove("hidden");
                        currentActivePlayBtn.querySelector(".pause-icon")?.classList.add("hidden");
                    }
                }
                currentActiveAudio = audio;
                currentActivePlayBtn = playBtn;
                playIcon.classList.add("hidden");
                pauseIcon.classList.remove("hidden");
            });

            playBtn.onclick = (e) => {
                e.stopPropagation();
                if (audio.paused) {
                    audio.play().catch(err => console.warn("Audio play prevented:", err));
                } else {
                    audio.pause();
                }
            };

            progressTrack.onclick = (e) => {
                e.stopPropagation();
                const rect = progressTrack.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                if (width > 0 && audio.duration) {
                    const pct = Math.max(0, Math.min(1, clickX / width));
                    audio.currentTime = pct * audio.duration;
                    progressBar.style.width = `${pct * 100}%`;
                }
            };
        }

        // --- Native Voice Recording & Vibes (AudioContext -> MediaRecorder -> Storage/Base64 -> Firestore) ---
        let mediaRecorder = null;
        let audioChunks = [];
        let recordStartTime = 0;
        let recordTimerInterval = null;
        let currentAudioStream = null;
        let audioContext = null;
        let analyserNode = null;
        let vibesAnimId = null;

        const voiceBtn = document.getElementById("voice-record-btn");
        const voiceBar = document.getElementById("voice-recording-bar");
        const cancelVoiceBtn = document.getElementById("cancel-voice-record-btn");
        const sendVoiceBtn = document.getElementById("send-voice-record-btn");
        const timerLabel = document.getElementById("recording-timer");

        function blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        function formatRecordTimer(totalSeconds) {
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

        function startVoiceVibes(stream) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 64;
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyserNode);

                const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
                const vibeBars = document.querySelectorAll("#voice-vibes-container .vibe-bar");

                function renderVibes() {
                    if (!analyserNode) return;
                    analyserNode.getByteFrequencyData(dataArray);
                    vibeBars.forEach((bar, idx) => {
                        const val = dataArray[idx * 2] || 0;
                        const h = Math.max(4, Math.min(22, Math.round((val / 255) * 22)));
                        bar.style.height = `${h}px`;
                        bar.style.animation = "none";
                    });
                    vibesAnimId = requestAnimationFrame(renderVibes);
                }
                renderVibes();
            } catch (e) {
                console.warn("AudioContext visualizer not supported, CSS animation fallback active:", e);
            }
        }

        function stopVoiceVibes() {
            if (vibesAnimId) cancelAnimationFrame(vibesAnimId);
            vibesAnimId = null;
            if (audioContext && audioContext.state !== "closed") {
                try { audioContext.close(); } catch(e){}
            }
            audioContext = null;
            analyserNode = null;
            document.querySelectorAll("#voice-vibes-container .vibe-bar").forEach(b => {
                b.style.height = "6px";
                b.style.animation = "";
            });
        }

        async function startVoiceRecording() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Voice recording is not supported in this browser. Please use Chrome, Edge, or Safari.");
                return;
            }

            try {
                currentAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                console.error("Microphone access error:", err);
                alert("Microphone permission denied or not available. Please allow microphone access to record voice notes.");
                return;
            }

            audioChunks = [];
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
            }

            try {
                mediaRecorder = mimeType ? new MediaRecorder(currentAudioStream, { mimeType }) : new MediaRecorder(currentAudioStream);
            } catch (e) {
                mediaRecorder = new MediaRecorder(currentAudioStream);
            }

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.start(200);
            recordStartTime = Date.now();
            voiceBar.classList.remove("hidden");
            voiceBtn.classList.add("recording");
            timerLabel.textContent = "0:00";

            startVoiceVibes(currentAudioStream);

            clearInterval(recordTimerInterval);
            recordTimerInterval = setInterval(() => {
                const elapsedSec = Math.floor((Date.now() - recordStartTime) / 1000);
                timerLabel.textContent = formatRecordTimer(elapsedSec);
            }, 500);
        }

        function stopAndCleanupStream() {
            clearInterval(recordTimerInterval);
            stopVoiceVibes();
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                try { mediaRecorder.stop(); } catch(e){}
            }
            if (currentAudioStream) {
                currentAudioStream.getTracks().forEach(t => t.stop());
                currentAudioStream = null;
            }
            voiceBar.classList.add("hidden");
            voiceBtn.classList.remove("recording");
        }

        function cancelVoiceRecording() {
            stopAndCleanupStream();
            audioChunks = [];
        }

        async function finishAndSendVoiceRecording() {
            const elapsedSec = Math.max(1, Math.floor((Date.now() - recordStartTime) / 1000));
            const durationFormatted = formatRecordTimer(elapsedSec);

            if (!activeConvId) {
                cancelVoiceRecording();
                alert("No active chat selected.");
                return;
            }

            return new Promise((resolve) => {
                if (!mediaRecorder) { cancelVoiceRecording(); resolve(); return; }

                mediaRecorder.onstop = async () => {
                    stopAndCleanupStream();

                    const mime = mediaRecorder.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunks, { type: mime });
                    audioChunks = [];

                    if (audioBlob.size < 400) {
                        console.warn("Audio note too short or empty.");
                        resolve();
                        return;
                    }

                    let audioUrl = null;
                    try {
                        // Directly encode to high-fidelity audio Data URL (zero CORS errors, instant multi-device sync via Firestore)
                        audioUrl = await blobToBase64(audioBlob);
                    } catch (b64Err) {
                        console.error("Voice encoding error:", b64Err);
                    }

                    if (audioUrl) {
                        try {
                            await addDoc(collection(db, "conversations", activeConvId, "messages"), {
                                senderUsername: currentUser.username,
                                type: "voice",
                                audioUrl,
                                duration: durationFormatted,
                                replyTo: replyingToMsg,
                                createdAt: new Date()
                            });

                            cancelReply();
                            updateConversationPreview(activeConvId, "🎤 Voice note");
                        } catch (err) {
                            console.error("Failed to save voice message in Firestore:", err);
                            alert("Failed to send voice note: " + (err.message || err));
                        }
                    } else {
                        alert("Could not process audio recording. Please try again.");
                    }
                    resolve();
                };

                stopAndCleanupStream();
            });
        }

        if (voiceBtn) {
            voiceBtn.addEventListener("click", () => {
                if (voiceBtn.classList.contains("recording")) {
                    finishAndSendVoiceRecording();
                } else {
                    startVoiceRecording();
                }
            });
        }
        if (cancelVoiceBtn) cancelVoiceBtn.addEventListener("click", cancelVoiceRecording);
        if (sendVoiceBtn) sendVoiceBtn.addEventListener("click", finishAndSendVoiceRecording);

        // --- Message Forwarding Modal & Handler ---
        let pendingForwardMessage = null;

        window.openForwardModal = (msgId, messageData) => {
            if (!messageData) return;
            pendingForwardMessage = messageData;

            const modal = document.getElementById("forward-modal");
            const previewEl = document.getElementById("forward-msg-preview");
            const listEl = document.getElementById("forward-chats-list");

            let previewContent = "";
            if (messageData.type === 'image') previewContent = "📷 Photo";
            else if (messageData.type === 'sticker') previewContent = "✨ Sticker";
            else if (messageData.type === 'voice') previewContent = `🎤 Voice note (${messageData.duration || ''})`;
            else if (messageData.type === 'survey') previewContent = `📊 Survey: ${messageData.question || ''}`;
            else previewContent = messageData.text || 'Message';

            previewEl.innerHTML = `<strong>Forwarding:</strong> ${previewContent}`;
            listEl.innerHTML = "";

            if (!allConversationsCache || allConversationsCache.length === 0) {
                listEl.innerHTML = "<p style='color:var(--text-muted);font-size:13px;padding:8px;'>No active conversations to forward to.</p>";
            } else {
                allConversationsCache.forEach(conv => {
                    const otherUser = conv.participantUsernames?.find(u => u !== currentUser.username) || "Chat";
                    const chatName = conv.isGroup ? (conv.groupName || "Group") : `@${otherUser}`;
                    const item = document.createElement("div");
                    item.className = "forward-chat-item";
                    item.innerHTML = `
                        <div class="forward-chat-left">
                            <div class="avatar-sm" style="width:34px;height:34px;font-size:13px;">${chatName.charAt(conv.isGroup ? 0 : 1).toUpperCase()}</div>
                            <span class="forward-chat-name">${chatName}</span>
                        </div>
                        <button type="button" class="forward-send-btn">Send ➔</button>
                    `;
                    item.querySelector(".forward-send-btn").onclick = async (e) => {
                        e.stopPropagation();
                        await executeForward(conv.id, chatName);
                    };
                    listEl.appendChild(item);
                });
            }

            modal.classList.remove("hidden");
        };

        async function executeForward(targetConvId, targetName) {
            if (!pendingForwardMessage) return;

            try {
                const forwardedData = {
                    senderUsername: currentUser.username,
                    type: pendingForwardMessage.type || 'text',
                    text: pendingForwardMessage.text || '',
                    imageUrl: pendingForwardMessage.imageUrl || '',
                    stickerUrl: pendingForwardMessage.stickerUrl || '',
                    audioUrl: pendingForwardMessage.audioUrl || '',
                    duration: pendingForwardMessage.duration || '',
                    surveyId: pendingForwardMessage.surveyId || '',
                    question: pendingForwardMessage.question || '',
                    options: pendingForwardMessage.options || [],
                    forwardedFrom: pendingForwardMessage.senderUsername,
                    createdAt: new Date()
                };

                await addDoc(collection(db, "conversations", targetConvId, "messages"), forwardedData);
                updateConversationPreview(targetConvId, `Forwarded: ${forwardedData.text || forwardedData.type}`);

                document.getElementById("forward-modal").classList.add("hidden");
                pendingForwardMessage = null;

                const toast = document.createElement("div");
                toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0F172A;color:#FFFFFF;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,0.25);";
                toast.textContent = `Message forwarded to ${targetName} ⚡`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);
            } catch (err) {
                console.error("Forward error:", err);
                alert("Failed to forward message.");
            }
        }

        const closeForwardModalBtn = document.getElementById("close-forward-modal");
        if (closeForwardModalBtn) {
            closeForwardModalBtn.addEventListener("click", () => {
                document.getElementById("forward-modal").classList.add("hidden");
                pendingForwardMessage = null;
            });
        }
