const requestDialog = document.querySelector("#request-dialog");
const requestForm = document.querySelector("#request-form");
const requestList = document.querySelector("#request-list");
const requestSearch = document.querySelector("#request-search");
const emptyState = document.querySelector("#empty-state");
const filters = [...document.querySelectorAll(".filter-button")];
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");
const authButton = document.querySelector("#auth-button");
const authDialog = document.querySelector("#auth-dialog");
const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const authTitle = document.querySelector("#auth-title");
const authSubmit = document.querySelector("#auth-submit");
const authModeToggle = document.querySelector("#auth-mode-toggle");
const resetPasswordButton = document.querySelector("#reset-password");
const emailInput = authForm.elements.email;
const passwordInput = authForm.elements.password;
const authStatus = document.querySelector("#auth-status");
const authStatusIcon = document.querySelector("#auth-status-icon");
const authStatusTitle = document.querySelector("#auth-status-title");
const authStatusText = document.querySelector("#auth-status-text");
const resendVerificationButton = document.querySelector("#resend-verification");
const refreshVerificationButton = document.querySelector("#refresh-verification");
const openRequestButtons = [
  document.querySelector("#new-request"),
  document.querySelector("#nav-new-request"),
  document.querySelector("#hero-new-request"),
  ...document.querySelectorAll("[data-open-request]")
];

let activeFilter = "all";
let firebaseAuth = null;
let currentUser = null;
let authMode = "signin";

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function setAuthMode(mode) {
  authMode = mode;
  const creatingAccount = mode === "signup";
  authTitle.textContent = creatingAccount ? "Create account" : "Sign in";
  authSubmit.textContent = creatingAccount ? "Create account" : "Sign in";
  authModeToggle.textContent = creatingAccount ? "Already have an account? Sign in" : "Create an account";
  resetPasswordButton.hidden = creatingAccount;
  passwordInput.autocomplete = creatingAccount ? "new-password" : "current-password";
  setAuthMessage(
    firebaseAuth
      ? "Use your Gmail address. We’ll email a verification link when you create your account."
      : "Email verification is not set up yet. Add your Firebase web configuration to firebase-config.js, enable Email/Password sign-in, and host this site on HTTPS or localhost.",
    !firebaseAuth
  );
}

function renderAuthState() {
  const isSignedIn = Boolean(currentUser);
  authButton.textContent = isSignedIn ? `Sign out · ${currentUser.email}` : "Sign in";
  authButton.setAttribute("aria-label", isSignedIn ? `Sign out ${currentUser.email}` : "Sign in");
  authStatus.hidden = !isSignedIn;
  if (!isSignedIn) return;

  const isVerified = currentUser.emailVerified;
  authStatus.classList.toggle("verified", isVerified);
  authStatusIcon.textContent = isVerified ? "✓" : "!";
  authStatusTitle.textContent = isVerified ? "Email verified" : "Verify your email address";
  authStatusText.textContent = isVerified
    ? `${currentUser.email} is verified.`
    : `We sent a verification link to ${currentUser.email}. Open it in Gmail, then return and check verification.`;
  resendVerificationButton.hidden = isVerified;
  refreshVerificationButton.hidden = isVerified;
}

function getAuthErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "An account already uses this email. Try signing in instead.",
    "auth/invalid-credential": "That email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/network-request-failed": "Could not reach Firebase. Check your connection and try again.",
    "auth/operation-not-allowed": "Email/password sign-in is disabled in Firebase Authentication settings.",
    "auth/too-many-requests": "Too many attempts. Wait a while, then try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/weak-password": "Choose a stronger password with at least 8 characters."
  };
  return messages[error.code] || `Authentication failed: ${error.message}`;
}

function isFirebaseConfigured(config) {
  return Boolean(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
}

function openAuthDialog(mode = "signin", message = "") {
  mainNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  authForm.reset();
  setAuthMode(mode);
  if (message) setAuthMessage(message);
  authDialog.showModal();
}

authButton.addEventListener("click", async () => {
  mainNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");

  if (currentUser) {
    try {
      await firebaseAuth.signOut();
    } catch (error) {
      authStatus.hidden = false;
      authStatusText.textContent = getAuthErrorMessage(error);
    }
    return;
  }

  openAuthDialog("signin");
});

document.querySelector("#close-auth").addEventListener("click", () => authDialog.close());
document.querySelector("#cancel-auth").addEventListener("click", () => authDialog.close());
authModeToggle.addEventListener("click", () => {
  setAuthMode(authMode === "signin" ? "signup" : "signin");
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!firebaseAuth) {
    setAuthMessage(
      "Firebase isn’t configured. Add the web app values to firebase-config.js, enable Email/Password under Authentication, and use HTTPS or localhost.",
      true
    );
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  authSubmit.disabled = true;
  try {
    if (authMode === "signup") {
      if (password.length < 8) {
        setAuthMessage("Choose a password with at least 8 characters.", true);
        return;
      }
      const credential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      await credential.user.sendEmailVerification();
      setAuthMessage("Account created. Check your Gmail inbox for the verification link.");
    } else {
      const credential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      if (!credential.user.emailVerified) {
        setAuthMessage("You’re signed in, but your email still needs verification. Check your inbox or resend the link.");
      }
    }
    authDialog.close();
  } catch (error) {
    setAuthMessage(getAuthErrorMessage(error), true);
  } finally {
    authSubmit.disabled = false;
  }
});

resetPasswordButton.addEventListener("click", async () => {
  if (!firebaseAuth) {
    setAuthMessage("Configure Firebase Email/Password authentication before requesting a password reset.", true);
    return;
  }

  if (!emailInput.validity.valid) {
    setAuthMessage("Enter your account email above before requesting a password reset.", true);
    emailInput.focus();
    return;
  }

  try {
    await firebaseAuth.sendPasswordResetEmail(emailInput.value.trim());
    setAuthMessage("If an account exists for this email, Firebase will send password reset instructions.");
  } catch (error) {
    setAuthMessage(getAuthErrorMessage(error), true);
  }
});

resendVerificationButton.addEventListener("click", async () => {
  if (!currentUser || currentUser.emailVerified) return;
  resendVerificationButton.disabled = true;
  try {
    await currentUser.sendEmailVerification();
    authStatusText.textContent = `A new verification link was sent to ${currentUser.email}. Check your Gmail inbox and spam folder.`;
  } catch (error) {
    authStatusText.textContent = getAuthErrorMessage(error);
  } finally {
    resendVerificationButton.disabled = false;
  }
});

refreshVerificationButton.addEventListener("click", async () => {
  if (!currentUser) return;
  refreshVerificationButton.disabled = true;
  try {
    await currentUser.reload();
    currentUser = firebaseAuth.currentUser;
    renderAuthState();
    if (currentUser && !currentUser.emailVerified) {
      authStatusText.textContent = `This email is not verified yet. Open the latest verification link sent to ${currentUser.email}.`;
    }
  } catch (error) {
    authStatusText.textContent = getAuthErrorMessage(error);
  } finally {
    refreshVerificationButton.disabled = false;
  }
});

const firebaseConfig = window.FDC_FIREBASE_CONFIG;
if (isFirebaseConfigured(firebaseConfig) && window.firebase) {
  try {
    const app = window.firebase.initializeApp(firebaseConfig);
    firebaseAuth = app.auth();
    firebaseAuth.onAuthStateChanged((user) => {
      currentUser = user;
      renderAuthState();
    });
  } catch (error) {
    console.error("Firebase initialization failed.", error);
    setAuthMessage(`Firebase could not initialize: ${error.message}`, true);
  }
}
setAuthMode("signin");

function updateDashboard() {
  const rows = [...requestList.querySelectorAll("tr")];
  const query = requestSearch.value.trim().toLowerCase();
  let visibleCount = 0;
  let activeCount = 0;
  let attentionCount = 0;
  let completedCount = 0;

  rows.forEach((row) => {
    const status = row.dataset.status;
    const matchesFilter = activeFilter === "all" || status === activeFilter;
    const matchesSearch = row.textContent.toLowerCase().includes(query);
    const isVisible = matchesFilter && matchesSearch;
    row.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
    if (status === "active") activeCount += 1;
    if (status === "attention") attentionCount += 1;
    if (status === "completed") completedCount += 1;
  });

  document.querySelector("#active-total").textContent = String(activeCount);
  document.querySelector("#attention-total").textContent = String(attentionCount);
  document.querySelector("#completed-total").textContent = String(completedCount);
  document.querySelector("#all-count").textContent = String(rows.length);
  document.querySelector("#visible-count").textContent = String(visibleCount);
  emptyState.hidden = visibleCount !== 0;
}

openRequestButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!currentUser) {
      openAuthDialog("signin", "Sign in to your verified FDC account before starting a request.");
      return;
    }
    if (!currentUser.emailVerified) {
      authStatus.hidden = false;
      authStatus.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    requestDialog.showModal();
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});
document.querySelector(".close-dialog").addEventListener("click", () => requestDialog.close());
document.querySelector("#cancel-request").addEventListener("click", () => requestDialog.close());
requestSearch.addEventListener("input", updateDashboard);

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  mainNav.classList.toggle("is-open", !isExpanded);
});

mainNav.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((filter) => {
      const selected = filter === button;
      filter.classList.toggle("selected", selected);
      filter.setAttribute("aria-pressed", String(selected));
    });
    updateDashboard();
  });
});

requestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(requestForm);
  const device = String(formData.get("device")).trim();
  const carrier = String(formData.get("carrier")).trim();
  const nextId = 1049 + requestList.querySelectorAll("tr").length - 4;
  const row = document.createElement("tr");
  row.dataset.status = "active";

  const deviceCell = document.createElement("td");
  const deviceIcon = document.createElement("span");
  deviceIcon.className = "device-thumb";
  deviceIcon.textContent = "▯";
  const deviceName = document.createElement("span");
  deviceName.className = "device-name";
  deviceName.textContent = device;
  deviceCell.append(deviceIcon, deviceName);

  const idCell = document.createElement("td");
  idCell.className = "request-id";
  idCell.textContent = `UL-${nextId}`;
  const carrierCell = document.createElement("td");
  carrierCell.textContent = carrier;
  const statusCell = document.createElement("td");
  statusCell.innerHTML = '<span class="status status-review"><i></i>Pending review</span>';
  const updatedCell = document.createElement("td");
  updatedCell.className = "updated";
  updatedCell.textContent = "Today";
  row.append(deviceCell, idCell, carrierCell, statusCell, updatedCell);
  requestList.prepend(row);

  requestForm.reset();
  requestSearch.value = "";
  requestDialog.close();
  activeFilter = "all";
  filters.forEach((filter) => {
    const selected = filter.dataset.filter === "all";
    filter.classList.toggle("selected", selected);
    filter.setAttribute("aria-pressed", String(selected));
  });
  updateDashboard();
});

document.querySelector("#year").textContent = String(new Date().getFullYear());

updateDashboard();
