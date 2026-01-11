// LocalStorage Keys
const STORAGE_KEY = "emi_tracker_data";
const SORT_PREFS_KEY = "emi_tracker_sort_prefs";
const ARCHIVED_KEY = "emi_tracker_archived";
const SEAL_STATE_KEY = "emi_tracker_seal_state";

// Global state
let searchQuery = "";
let showArchived = false;
let isSealCountdownActive = false;
let sealCountdownTimer = null;
let undoGracePeriodTimer = null;
let lastSealedItems = []; // Track items sealed in current seal operation

// Get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Toggle form fields based on type selection
function toggleFormFields() {
  const isEMI = document.getElementById("typeEMI").checked;
  const emiOnlyFields = document.getElementById("emiOnlyFields");
  const endDateInput = document.getElementById("emiEndDate");
  const endDateRequired = document.getElementById("endDateRequired");
  const endDateHelper = document.getElementById("endDateHelper");
  const endDateGroup = document.getElementById("endDateGroup");
  const nameInput = document.getElementById("emiName");
  const nameLabel = document.getElementById("nameLabel");
  const amountLabel = document.getElementById("amountLabel");
  const endDateLabel = document.getElementById("endDateLabel");
  const categoryExpenseOption = document.getElementById(
    "categoryExpenseOption"
  );

  if (isEMI) {
    // EMI mode
    categoryExpenseOption.textContent = "Loan/Debt";
    endDateInput.required = true;
    endDateRequired.style.display = "inline";
    endDateHelper.style.display = "none";
    endDateGroup.style.display = "block";
    nameInput.placeholder = "e.g., Home Loan, Car EMI, SIP, RD";
    nameLabel.innerHTML = 'Name <span class="required">*</span>';
    amountLabel.innerHTML =
      'Monthly Amount (₹) <span class="required">*</span>';
    endDateLabel.innerHTML =
      'End Date <span class="required" id="endDateRequired">*</span>';

    // Check category to show/hide EMI Details
    toggleCategoryFields();
  } else {
    // Constant Expense mode
    emiOnlyFields.classList.remove("active");
    categoryExpenseOption.textContent = "Expense";
    endDateInput.required = false;
    endDateRequired.style.display = "none";
    endDateHelper.style.display = "none";
    endDateGroup.style.display = "none";
    nameInput.placeholder = "e. g., Rent, Utilities, SIP, Insurance";
    nameLabel.innerHTML = 'Name <span class="required">*</span>';
    amountLabel.innerHTML =
      'Monthly Amount (₹) <span class="required">*</span>';

    // Clear EMI-only fields
    document.getElementById("totalAmount").value = "";
    document.getElementById("principalPaid").value = "";
    document.getElementById("interestPaid").value = "";
    document.getElementById("emiEndDate").value = "";
  }
}

// Toggle category-specific fields
function toggleCategoryFields() {
  const isEMI = document.getElementById("typeEMI").checked;
  const category = document.getElementById("emiCategory").value;
  const emiOnlyFields = document.getElementById("emiOnlyFields");

  // Only show EMI Details for EMI type with Expense/Debt category
  if (isEMI && category === "expense") {
    emiOnlyFields.classList.add("active");
  } else {
    emiOnlyFields.classList.remove("active");
    // Clear fields when hiding
    if (category === "savings") {
      document.getElementById("totalAmount").value = "";
      document.getElementById("principalPaid").value = "";
      document.getElementById("interestPaid").value = "";
    }
  }
}

// Load EMIs from localStorage
function loadEMIs() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Save EMIs to localStorage
function saveEMIs(emis) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emis));
}

// Load archived items
function loadArchived() {
  const data = localStorage.getItem(ARCHIVED_KEY);
  return data ? JSON.parse(data) : [];
}

// Save archived items
function saveArchived(archived) {
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archived));
}

// ========== SEAL STATE MANAGEMENT ==========

// Load seal state from localStorage
function loadSealState() {
  const data = localStorage.getItem(SEAL_STATE_KEY);
  return data ? JSON.parse(data) : {
    isSealed: false,
    sealedMonth: null,
    sealedDate: null,
    sealedItems: []
  };
}

// Save seal state to localStorage
function saveSealState(state) {
  localStorage.setItem(SEAL_STATE_KEY, JSON.stringify(state));
}

// Check if current month is sealed
function isSealedThisMonth() {
  const sealState = loadSealState();
  const currentMonth = getCurrentMonth();
  return sealState.isSealed && sealState.sealedMonth === currentMonth;
}

// Check if sealing process is currently active (countdown or undo period)
function isSealingInProgress() {
  return sealCountdownTimer !== null || undoGracePeriodTimer !== null;
}

// Check if a specific item was sealed (not just if month is sealed)
function wasItemSealed(emi) {
  const sealState = loadSealState();
  const currentMonth = getCurrentMonth();
  
  if (!sealState.isSealed || sealState.sealedMonth !== currentMonth) {
    return false;
  }
  
  // Check if this item exists in the sealed snapshot
  return sealState.sealedItems.some(sealed => 
    sealed.emiName === emi.emiName && 
    sealed.emiAmount === emi.emiAmount && 
    sealed.dueDate === emi.dueDate
  );
}

// Check if all current active items are sealed
function areAllActiveItemsSealed() {
  const emis = loadEMIs();
  const sealState = loadSealState();
  const currentMonth = getCurrentMonth();
  
  if (!sealState.isSealed || sealState.sealedMonth !== currentMonth) {
    return false;
  }
  
  const today = new Date();
  const activeItems = emis.filter(emi => {
    if (emi.emiEndDate) {
      const endDate = new Date(emi.emiEndDate);
      return endDate >= today;
    }
    return true;
  });
  
  if (activeItems.length === 0) return false;
  
  // Check if ALL active items are in sealed list
  return activeItems.every(emi => wasItemSealed(emi));
}

// Check if seal button should be enabled (at least 1 payment checked)
function checkSealButtonState() {
  const emis = loadEMIs();
  const currentMonth = getCurrentMonth();
  
  // Filter active items only
  const today = new Date();
  const activeItems = emis.filter(emi => {
    if (emi.emiEndDate) {
      const endDate = new Date(emi.emiEndDate);
      return endDate >= today;
    }
    return true; // Ongoing items
  });
  
  // No items?
  if (activeItems.length === 0) {
    return { enabled: false, reason: "No active items to seal" };
  }
  
  // Find unsealed items (items not in the sealed snapshot)
  const unsealedItems = activeItems.filter(emi => !wasItemSealed(emi));
  
  if (unsealedItems.length === 0) {
    // All items already sealed
    return { enabled: false, reason: "All items already sealed" };
  }
  
  // Check if at least one UNSEALED item is paid
  const unsealedPaidItems = unsealedItems.filter(emi =>
    emi.isPaidThisMonth && emi.currentMonth === currentMonth
  );
  
  if (unsealedPaidItems.length === 0) {
    return { enabled: false, reason: "Check at least one payment to enable" };
  }
  
  return { enabled: true, reason: "" };
}

// Get next month's first date
function getNextMonthDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
  return `${monthNames[nextMonth.getMonth()]} ${nextMonth.getDate()}, ${nextMonth.getFullYear()}`;
}

// Check and unlock if new month started
function checkAndUnlockNewMonth() {
  const sealState = loadSealState();
  const currentMonth = getCurrentMonth();
  
  if (sealState.isSealed && sealState.sealedMonth !== currentMonth) {
    // New month - unlock!
    saveSealState({
      isSealed: false,
      sealedMonth: null,
      sealedDate: null,
      sealedItems: []
    });
    
    removeSealedUI();
    
    // Show toast
    const toast = document.getElementById("paymentToast");
    toast.textContent = "🎊 New month started! Payment status reset.";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 4000);
  }
}

// ========== SEAL WORKFLOW FUNCTIONS ==========

// Update seal button state (enabled/disabled)
function updateSealButton() {
  const btn = document.getElementById('sealControlBtn');
  
  const state = checkSealButtonState();
  
  if (state.enabled) {
    btn.disabled = false;
    btn.title = "Lock all payments for this month";
  } else {
    btn.disabled = true;
    btn.title = state.reason;
  }
}

// Step 1: User clicks "SEAL MONTH" button
function initiateSeal() {
  const modal = document.getElementById('sealModal');
  const nextMonth = getNextMonthDate();
  document.getElementById('sealUntilDate').textContent = `📅 ${nextMonth}`;
  modal.classList.add('active');
}

// Close seal confirmation modal
function closeSealModal() {
  const modal = document.getElementById('sealModal');
  modal.classList.remove('active');
}

// Step 2: User confirms - start countdown
function confirmSeal() {
  closeSealModal();
  startSealCountdown();
}

// Step 3: 3-second countdown with abort option
function startSealCountdown() {
  isSealCountdownActive = true;
  let countdown = 3;
  
  const toast = document.getElementById('countdownToast');
  const text = document.getElementById('countdownText');
  const overlay = document.getElementById('sealingOverlay');
  
  // Show overlay to disable background
  overlay.classList.add('active');
  
  toast.classList.add('show');
  text.textContent = `⏳ Sealing... (${countdown}s)`;
  
  sealCountdownTimer = setInterval(() => {
    countdown--;
    text.textContent = `⏳ Sealing... (${countdown}s)`;
    
    if (countdown <= 0) {
      clearInterval(sealCountdownTimer);
      sealCountdownTimer = null;
      toast.classList.remove('show');
      // Keep overlay active for undo period
      executeSeal();
    }
  }, 1000);
}

// Abort seal during countdown
function abortSeal() {
  if (sealCountdownTimer) {
    clearInterval(sealCountdownTimer);
    sealCountdownTimer = null;
  }
  
  isSealCountdownActive = false;
  
  const toast = document.getElementById('countdownToast');
  const overlay = document.getElementById('sealingOverlay');
  
  toast.classList.remove('show');
  overlay.classList.remove('active'); // Hide overlay
}

// Step 4: Execute seal and start grace period
function executeSeal() {
  const emis = loadEMIs();
  const currentMonth = getCurrentMonth();
  const existingSealState = loadSealState();
  
  // Get existing sealed items or empty array
  const existingSealedItems = (existingSealState.isSealed && existingSealState.sealedMonth === currentMonth)
    ? existingSealState.sealedItems
    : [];
  
  // Add new items to sealed list (only unsealed AND PAID ones)
  const newItemsToSeal = emis
    .filter(emi => 
      !wasItemSealed(emi) && 
      emi.isPaidThisMonth && 
      emi.currentMonth === currentMonth
    )
    .map(emi => ({
      emiName: emi.emiName,
      emiAmount: emi.emiAmount,
      dueDate: emi.dueDate
    }));
  
  // Combine existing sealed items with new ones
  const allSealedItems = [...existingSealedItems, ...newItemsToSeal];
  
  // Store newly sealed items for finalizeSeal message
  lastSealedItems = newItemsToSeal;
  
  const sealState = {
    isSealed: true,
    sealedMonth: currentMonth,
    sealedDate: new Date().toISOString(),
    sealedItems: allSealedItems
  };
  
  saveSealState(sealState);
  applySealedUI();
  startUndoGracePeriod();
}

// Step 5: 5-second undo grace period
function startUndoGracePeriod() {
  let countdown = 5;
  
  const toast = document.getElementById('undoToast');
  const text = document.getElementById('undoText');
  const overlay = document.getElementById('sealingOverlay');
  
  // Overlay should already be active from countdown
  toast.classList.add('show');
  text.textContent = `✅ Sealed! (${countdown}s)`;
  
  undoGracePeriodTimer = setInterval(() => {
    countdown--;
    text.textContent = `✅ Sealed! (${countdown}s)`;
    
    if (countdown <= 0) {
      clearInterval(undoGracePeriodTimer);
      undoGracePeriodTimer = null;
      toast.classList.remove('show');
      overlay.classList.remove('active'); // Hide overlay when done
      finalizeSeal();
    }
  }, 1000);
}

// Undo seal during grace period
function undoSeal() {
  if (undoGracePeriodTimer) {
    clearInterval(undoGracePeriodTimer);
    undoGracePeriodTimer = null;
  }
  
  const toast = document.getElementById('undoToast');
  const overlay = document.getElementById('sealingOverlay');
  
  toast.classList.remove('show');
  overlay.classList.remove('active'); // Hide overlay
  
  // Remove seal
  saveSealState({
    isSealed: false,
    sealedMonth: null,
    sealedDate: null,
    sealedItems: []
  });
  
  removeSealedUI();
  renderTable();
}

// Finalize seal after grace period
function finalizeSeal() {
  const toast = document.getElementById('paymentToast');
  
  // Check if ALL active items are now sealed
  if (areAllActiveItemsSealed()) {
    // All items sealed - show superToast for financial peace
    const superToast = document.getElementById('superToast');
    superToast.classList.add('show');
    setTimeout(() => superToast.classList.remove('show'), 6000);
  } else {
    // Partial seal - show which items were sealed
    if (lastSealedItems.length === 1) {
      // Single item sealed
      toast.textContent = `🔒 Sealed! Forget "${lastSealedItems[0].emiName}" this month`;
    } else if (lastSealedItems.length === 2) {
      // Two items sealed
      toast.textContent = `🔒 Sealed! Forget "${lastSealedItems[0].emiName}" and "${lastSealedItems[1].emiName}" this month`;
    } else {
      // Multiple items sealed
      const names = lastSealedItems.slice(0, 2).map(item => item.emiName).join('", "');
      const remaining = lastSealedItems.length - 2;
      toast.textContent = `🔒 Sealed! Forget "${names}" and ${remaining} more this month`;
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 5000);
  }
  
  // Clear last sealed items
  lastSealedItems = [];
}

// ========== SEAL UI TRANSFORMATIONS ==========

// Apply sealed UI state
function applySealedUI() {
  const tableWrapper = document.getElementById('tableWrapper');
  
  // Only show banner if ALL current items are sealed
  if (areAllActiveItemsSealed()) {
    tableWrapper.classList.add('sealed');
  } else {
    tableWrapper.classList.remove('sealed');
  }
  
  renderTable(); // Re-render with locks
}

// Remove sealed UI state
function removeSealedUI() {
  const tableWrapper = document.getElementById('tableWrapper');
  const badge = document.getElementById('sealedBadge');
  
  tableWrapper.classList.remove('sealed');
  badge.style.display = 'none'; // Ensure badge is hidden
}

// Check and auto-archive completed items
function autoArchiveCompleted() {
  const emis = loadEMIs();
  const exportBtn = document.getElementById("export");
  
  const archived = loadArchived();

  if (exportBtn) {
    if (emis.length === 0 && archived.length === 0) {
      exportBtn.disabled = true;
    } else {
      exportBtn.disabled = false;
    }
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stillActive = [];
  let archived_count = 0;

  emis.forEach((emi) => {
    if (emi.emiEndDate) {
      const endDate = new Date(emi.emiEndDate);
      endDate.setHours(0, 0, 0, 0);

      if (endDate < today) {
        // Archive this item
        archived.push({
          ...emi,
          archivedDate: new Date().toISOString(),
        });
        archived_count++;
      } else {
        stillActive.push(emi);
      }
    } else {
      stillActive.push(emi);
    }
  });

  if (archived_count > 0) {
    saveEMIs(stillActive);
    saveArchived(archived);
  }
}

// Toggle archived view
function toggleArchivedView() {
  showArchived = !showArchived;
  const toggleText = document.getElementById("viewToggleText");
  const tableWrapper = document.getElementById("tableWrapper");

  toggleText.textContent = showArchived ? "📋 View Active" : "📦 View Archive";

  if (showArchived) {
    tableWrapper.classList.add("archive-mode");
  } else {
    tableWrapper.classList.remove("archive-mode");
  }

  renderTable();
}

// Mark item as paid
function markAsPaid(index) {
  if (isSealingInProgress()) {
    return; // Silently block when sealing in progress
  }
  
  const emis = loadEMIs();
  
  // Block if THIS specific item is sealed
  if (wasItemSealed(emis[index])) {
    return; // Can't mark a sealed item
  }
  
  const currentMonth = getCurrentMonth();

  if (
    !emis[index].isPaidThisMonth ||
    emis[index].currentMonth !== currentMonth
  ) {
    emis[index].isPaidThisMonth = true;
    emis[index].currentMonth = currentMonth;
    saveEMIs(emis);

    // Get item category
    const category = emis[index].emiCategory || "expense";

    // Show toast based on category
    const toast = document.getElementById("paymentToast");
    if (category === "savings") {
      toast.textContent = "Thanks for Saving!  💰";
    } else {
      toast.textContent = "Thanks for paying! 🎉";
    }
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);

    // Check if all items are paid
    checkAllPaidAndCelebrate();

    renderTable();
  }
}

// Check if all items are paid and show celebration
function checkAllPaidAndCelebrate() {
  const emis = loadEMIs();
  const currentMonth = getCurrentMonth();

  if (emis.length === 0) return;

  // Count active items (exclude completed/archived)
  const today = new Date();
  const activeItems = emis.filter((emi) => {
    if (emi.emiEndDate) {
      const endDate = new Date(emi.emiEndDate);
      return endDate >= today;
    }
    return true; // Ongoing items
  });

  if (activeItems.length === 0) return;

  // Filter to only UNSEALED items (so we don't count already sealed items)
  const unsealedItems = activeItems.filter(emi => !wasItemSealed(emi));
  
  if (unsealedItems.length === 0) return; // All items already sealed

  // Count paid items among unsealed items
  const paidItems = unsealedItems.filter(
    (emi) => emi.isPaidThisMonth && emi.currentMonth === currentMonth
  );

  // All unsealed items paid?
  if (paidItems.length === unsealedItems.length) {
    const toast = document.getElementById("paymentToast");
    toast.textContent = "🎉 Super! Now seal it to preserve from accidental touches, doubts and all";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 5000); // Longer display
  }
}

// Unmark item as paid
function unmarkAsPaid(index) {
  if (isSealingInProgress()) {
    return; // Silently block when sealing in progress
  }
  
  const emis = loadEMIs();
  
  // Block if THIS specific item is sealed
  if (wasItemSealed(emis[index])) {
    return; // Can't unmark a sealed item
  }
  emis[index].isPaidThisMonth = false;
  emis[index].currentMonth = "";
  saveEMIs(emis);
  renderTable();
}

// Handle search input
let searchTimeout;
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = document.getElementById("searchInput").value.toLowerCase();
    renderTable();
  }, 300);
}

// Filter items based on search
function filterBySearch(emis) {
  if (!searchQuery) return emis;

  return emis.filter((emi) => {
    const nameMatch = emi.emiName.toLowerCase().includes(searchQuery);
    const amountMatch = emi.emiAmount.toString().includes(searchQuery);
    return nameMatch || amountMatch;
  });
}

// Calculate period left
function calculatePeriodLeft(endDate, type, category) {
  if (!endDate) {
    return { text: "Ongoing", class: "normal" };
  }

  const today = new Date();
  const end = new Date(endDate);

  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: "Completed", class: "normal" };
  }

  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = diffDays % 30;

  let periodText = "";
  if (years > 0) periodText += `${years}y `;
  if (months > 0) periodText += `${months}m `;
  if (days > 0 || periodText === "") periodText += `${days}d`;

  // Savings always show as normal (positive)
  if (category === "savings") {
    return { text: periodText.trim(), class: "normal" };
  }

  let statusClass = "critical";
  if (diffDays <= 30) statusClass = "normal";
  else if (diffDays <= 90) statusClass = "warning";

  return { text: periodText.trim(), class: statusClass };
}

// Format currency
function formatCurrency(amount) {
  if (!amount && amount !== 0) return "—";
  return (
    "₹" +
    parseFloat(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Load sort preferences
function loadSortPrefs() {
  const prefs = localStorage.getItem(SORT_PREFS_KEY);
  return prefs
    ? JSON.parse(prefs)
    : { sortBy: "dueDate", sortDirection: "asc", groupBy: "type" };
}

// Save sort preferences
function saveSortPrefs(prefs) {
  localStorage.setItem(SORT_PREFS_KEY, JSON.stringify(prefs));
}

// Toggle sort direction
function toggleSortDirection() {
  const btn = document.getElementById("sortDirection");
  const prefs = loadSortPrefs();
  prefs.sortDirection = prefs.sortDirection === "asc" ? "desc" : "asc";
  btn.textContent = prefs.sortDirection === "asc" ? "↑" : "↓";
  saveSortPrefs(prefs);
  renderTable();
}

// Apply sort and group
function applySortAndGroup() {
  const sortBy = document.getElementById("sortBy").value;
  const groupBy = document.getElementById("groupBy").value;
  const prefs = loadSortPrefs();
  prefs.sortBy = sortBy;
  prefs.groupBy = groupBy;
  saveSortPrefs(prefs);
  renderTable();
}

// Get period left in days for sorting
function getPeriodInDays(endDate) {
  if (!endDate) return Infinity; // Ongoing items go last
  const today = new Date();
  const end = new Date(endDate);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

// Sort EMIs based on criteria
function sortEMIs(emis, sortBy, direction) {
  const sorted = [...emis];
  const dir = direction === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    let compareA, compareB;

    switch (sortBy) {
      case "dueDate":
        compareA = a.dueDate;
        compareB = b.dueDate;
        break;
      case "amount":
        compareA = a.emiAmount;
        compareB = b.emiAmount;
        break;
      case "endDate":
        compareA = a.emiEndDate ? new Date(a.emiEndDate).getTime() : Infinity;
        compareB = b.emiEndDate ? new Date(b.emiEndDate).getTime() : Infinity;
        break;
      case "periodLeft":
        compareA = getPeriodInDays(a.emiEndDate);
        compareB = getPeriodInDays(b.emiEndDate);
        break;
      case "name":
        compareA = a.emiName.toLowerCase();
        compareB = b.emiName.toLowerCase();
        return dir * compareA.localeCompare(compareB);
      case "type":
        compareA = a.type;
        compareB = b.type;
        return dir * compareA.localeCompare(compareB);
      case "category":
        compareA = a.emiCategory || "expense";
        compareB = b.emiCategory || "expense";
        return dir * compareA.localeCompare(compareB);
      case "entry":
      default:
        return 0; // Keep original order
    }

    if (compareA < compareB) return -1 * dir;
    if (compareA > compareB) return 1 * dir;
    return 0;
  });

  return sorted;
}

// Group EMIs based on criteria
function groupEMIs(emis, groupBy) {
  if (groupBy === "none") return { "All Items": emis };

  const groups = {};

  emis.forEach((emi) => {
    let groupKey;

    switch (groupBy) {
      case "category":
        const cat = emi.emiCategory || "expense";
        groupKey = cat === "savings" ? "💰 Savings" : "💳 Loan/Debt";
        break;
      case "type":
        groupKey = emi.type === "emi" ? "💳 EMI" : "🏠 Constant Expense";
        break;
      case "dueDateRange":
        const day = emi.dueDate;
        if (day <= 10) groupKey = "📅 Early Month (1-10)";
        else if (day <= 20) groupKey = "📅 Mid Month (11-20)";
        else groupKey = "📅 Late Month (21-31)";
        break;
      case "status":
        if (!emi.emiEndDate) {
          groupKey = "🔄 Ongoing";
        } else {
          const days = getPeriodInDays(emi.emiEndDate);
          if (days < 0) groupKey = "✅ Completed";
          else groupKey = "⏳ Active";
        }
        break;
      default:
        groupKey = "All Items";
    }

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(emi);
  });

  return groups;
}

// Calculate group total
function calculateGroupTotal(groupItems) {
  const currentMonth = getCurrentMonth();
  return groupItems.reduce((sum, emi) => {
    // Skip if paid this month
    if (emi.isPaidThisMonth && emi.currentMonth === currentMonth) {
      return sum;
    }
    // Skip if completed
    if (emi.emiEndDate) {
      const today = new Date();
      const end = new Date(emi.emiEndDate);
      if (end < today) {
        return sum;
      }
    }
    return sum + parseFloat(emi.emiAmount || 0);
  }, 0);
}

// Render EMI table
function renderTable() {
  autoArchiveCompleted(); // Auto-archive before rendering

  let emis = showArchived ? loadArchived() : loadEMIs();
  const tbody = document.getElementById("emiTableBody");
  const emptyState = document.getElementById("emptyState");

  // Apply search filter
  emis = filterBySearch(emis);

  if (emis.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    if (!showArchived) {
      updateSummary(loadEMIs());
    }
    return;
  }

  emptyState.style.display = "none";

  // Apply sorting and grouping
  const prefs = loadSortPrefs();
  const sorted = sortEMIs(emis, prefs.sortBy, prefs.sortDirection);
  const grouped = groupEMIs(sorted, prefs.groupBy);

  let html = "";

  Object.keys(grouped).forEach((groupName) => {
    const groupTotal = calculateGroupTotal(grouped[groupName]);

    // Add group header if grouping is enabled
    if (prefs.groupBy !== "none") {
      html += `
              <tr class="group-header">
                <td colspan="11">${groupName} (${
        grouped[groupName].length
      }) - Total: ${formatCurrency(groupTotal)}</td>
              </tr>
            `;
    }

    // Add rows for this group
    grouped[groupName].forEach((emi) => {
      const allEmis = showArchived ? loadArchived() : loadEMIs();
      const originalIndex = allEmis.findIndex(
        (e) =>
          e.emiName === emi.emiName &&
          e.emiAmount === emi.emiAmount &&
          e.dueDate === emi.dueDate
      );

      html += generateRowHTML(emi, originalIndex);
    });
  });

  tbody.innerHTML = html;
  if (!showArchived) {
    updateSummary(loadEMIs());
  }
  
  // Update sealed banner state based on current items
  const tableWrapper = document.getElementById('tableWrapper');
  if (isSealedThisMonth() && areAllActiveItemsSealed()) {
    tableWrapper.classList.add('sealed');
  } else {
    tableWrapper.classList.remove('sealed');
  }
  
  // Update seal button state
  updateSealButton();
}

// Generate HTML for a single row
function generateRowHTML(emi, index) {
  const isEMI = emi.type === "emi";
  const category = emi.emiCategory || "expense";
  const currentMonth = getCurrentMonth();
  const isPaid = emi.isPaidThisMonth && emi.currentMonth === currentMonth;
  const periodLeft = calculatePeriodLeft(emi.emiEndDate, emi.type, category);
  const sealed = wasItemSealed(emi); // Check if THIS specific item was sealed

  let typeIcon, typeText, rowClass;
  if (category === "savings") {
    typeIcon = "💰";
    typeText = isEMI ? "Savings EMI" : "Savings";
    rowClass = "savings-row";
  } else {
    if (isEMI) {
      typeIcon = "💳";
      typeText = "Loan/Debt EMI";
    } else {
      typeIcon = "🏠";
      typeText = "Expense";
    }
    rowClass = "loan-row";
  }

  if (isPaid) {
    rowClass += " paid-row";
  }
  
  if (sealed) {
    rowClass += " sealed-row";
  }

  // Show lock icon instead of checkbox when sealed
  const checkboxHtml = showArchived
    ? `<td><input type="checkbox" disabled class="payment-checkbox" /></td>`
    : sealed
    ? `<td><span class="lock-icon">🔒</span></td>`
    : `<td><input type="checkbox" ${isPaid ? "checked" : ""} onchange="${
        isPaid ? `unmarkAsPaid(${index})` : `markAsPaid(${index})`
      }" class="payment-checkbox" /></td>`;

  const actionsHtml = showArchived
    ? `<td><div class="actions"><button class="btn-icon" disabled>📦</button></div></td>`
    : sealed
    ? `<td><div class="actions sealed"><button class="btn-icon" disabled>🔒</button></div></td>`
    : `<td>
            <div class="actions">
              <button class="btn-icon edit" onclick="editEMI(${index})" aria-label="Edit">✏️</button>
              <button class="btn-icon delete" onclick="deleteEMI(${index})" aria-label="Delete">🗑️</button>
            </div>
          </td>`;

  return `
          <tr class="${rowClass}">
            ${checkboxHtml}
            <td><span style="font-size: 18px;" title="${typeText}">${typeIcon}</span></td>
            <td><strong>${emi.emiName}</strong></td>
            <td class="amount">${formatCurrency(emi.emiAmount)}</td>
            <td class="date"><strong>${emi.dueDate}${getDaySuffix(
    emi.dueDate
  )}</strong> of every month</td>
            <td class="date"><strong>${
              emi.emiEndDate
                ? formatDate(emi.emiEndDate)
                : '<span class="na-value">Ongoing</span>'
            }</td>
            <td><span class="period-left ${periodLeft.class}">${
    periodLeft.text
  }</span></td>
            <td class="${!emi.totalAmount || !isEMI ? "na-value" : ""}">${
    !isEMI ? "—" : formatCurrency(emi.totalAmount)
  }</td>
            <td class="${!emi.principalPaid || !isEMI ? "na-value" : ""}">${
    !isEMI ? "—" : formatCurrency(emi.principalPaid)
  }</td>
            <td class="${!emi.interestPaid || !isEMI ? "na-value" : ""}">${
    !isEMI ? "—" : formatCurrency(emi.interestPaid)
  }</td>
            ${actionsHtml}
          </tr>
        `;
}

// Get day suffix (st, nd, rd, th)
function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// Update summary cards
function updateSummary(emis) {
  const currentMonth = getCurrentMonth();
  const totalEMIs = emis.length;

  let totalMonthly = 0;
  let debtAmount = 0;
  let savingsAmount = 0;

  emis.forEach((emi) => {
    // Skip if paid this month
    if (emi.isPaidThisMonth && emi.currentMonth === currentMonth) {
      return;
    }

    // Skip if completed (end date has passed)
    if (emi.emiEndDate) {
      const today = new Date();
      const end = new Date(emi.emiEndDate);
      if (end < today) {
        return;
      }
    }

    const amount = parseFloat(emi.emiAmount || 0);
    totalMonthly += amount;

    const category = emi.emiCategory || "expense";
    if (category === "savings") {
      savingsAmount += amount;
    } else {
      debtAmount += amount;
    }
  });

  // Calculate total debt (only for non-savings EMIs)
  const totalDebt = emis.reduce((sum, emi) => {
    const category = emi.emiCategory || "expense";
    if (emi.type === "emi" && category !== "savings") {
      const remaining = (emi.totalAmount || 0) - (emi.principalPaid || 0);
      return sum + Math.max(remaining, 0);
    }
    return sum;
  }, 0);

  document.getElementById("totalEMIs").textContent = totalEMIs;
  document.getElementById("totalMonthly").textContent =
    formatCurrency(totalMonthly);
  document.getElementById(
    "monthlyBreakdown"
  ).innerHTML = `Debt: ${formatCurrency(
    debtAmount
  )} | Savings: ${formatCurrency(savingsAmount)}`;
  document.getElementById("totalDebt").textContent = formatCurrency(totalDebt);
}

// Open modal
function openModal(editIndex = null) {
  if (isSealingInProgress()) {
    return; // Silently block during sealing process
  }
  
  const modal = document.getElementById("emiModal");
  const form = document.getElementById("emiForm");
  const modalTitle = document.getElementById("modalTitle");
  const submitBtn = document.getElementById("submitBtn");

  form.reset();
  document.getElementById("editIndex").value = "";

  // Reset to EMI by default
  document.getElementById("typeEMI").checked = true;
  toggleFormFields();

  if (editIndex !== null) {
    const emis = loadEMIs();
    const emi = emis[editIndex];

    // Set type
    if (emi.type === "expense") {
      document.getElementById("typeExpense").checked = true;
    } else {
      document.getElementById("typeEMI").checked = true;
    }
    toggleFormFields();

    // Set category (default to expense for backward compatibility)
    const category = emi.emiCategory || "expense";
    document.getElementById("emiCategory").value = category;

    document.getElementById("emiName").value = emi.emiName;
    document.getElementById("emiAmount").value = emi.emiAmount;
    document.getElementById("dueDate").value = emi.dueDate;
    document.getElementById("emiEndDate").value = emi.emiEndDate || "";
    document.getElementById("totalAmount").value = emi.totalAmount || "";
    document.getElementById("principalPaid").value = emi.principalPaid || "";
    document.getElementById("interestPaid").value = emi.interestPaid || "";
    document.getElementById("editIndex").value = editIndex;

    modalTitle.textContent = "Edit Item";
    submitBtn.textContent = "Update Item";
  } else {
    modalTitle.textContent = "Add New Item";
    submitBtn.textContent = "Add Item";
  }

  modal.classList.add("active");
}

// Close modal
function closeModal() {
  const modal = document.getElementById("emiModal");
  modal.classList.remove("active");
}

// Edit EMI
function editEMI(index) {
  if (isSealingInProgress()) {
    return; // Silently block during sealing process
  }
  
  const emis = loadEMIs();
  const emi = emis[index];
  
  if (wasItemSealed(emi)) {
    alert('🔒 Cannot edit sealed payments. Wait until next month.');
    return;
  }
  openModal(index);
}

// Delete EMI
function deleteEMI(index) {
  if (isSealingInProgress()) {
    return; // Silently block during sealing process
  }
  
  const emis = loadEMIs();
  const emi = emis[index];
  
  if (wasItemSealed(emi)) {
    alert('🔒 Cannot delete sealed payments. Wait until next month.');
    return;
  }
  if (confirm("Are you sure you want to delete this item?")) {
    const emis = loadEMIs();
    emis.splice(index, 1);
    saveEMIs(emis);
    renderTable();
  }
}

// Handle form submission
document.getElementById("emiForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const itemType = document.querySelector(
    'input[name="itemType"]:checked'
  ).value;
  const endDateValue = document.getElementById("emiEndDate").value;
  const emiCategory = document.getElementById("emiCategory").value;

  const emiData = {
    type: itemType,
    emiCategory: emiCategory,
    emiName: document.getElementById("emiName").value,
    emiAmount: parseFloat(document.getElementById("emiAmount").value),
    dueDate: parseInt(document.getElementById("dueDate").value),
    emiEndDate: endDateValue || null,
    totalAmount:
      itemType === "emi" && document.getElementById("totalAmount").value
        ? parseFloat(document.getElementById("totalAmount").value)
        : null,
    principalPaid:
      itemType === "emi" && document.getElementById("principalPaid").value
        ? parseFloat(document.getElementById("principalPaid").value)
        : null,
    interestPaid:
      itemType === "emi" && document.getElementById("interestPaid").value
        ? parseFloat(document.getElementById("interestPaid").value)
        : null,
    isPaidThisMonth: false,
    currentMonth: "",
  };

  const emis = loadEMIs();
  const editIndex = document.getElementById("editIndex").value;

  if (editIndex !== "") {
    // Preserve payment status when editing
    const oldEmi = emis[parseInt(editIndex)];
    emiData.isPaidThisMonth = oldEmi.isPaidThisMonth || false;
    emiData.currentMonth = oldEmi.currentMonth || "";
    emis[parseInt(editIndex)] = emiData;
  } else {
    emis.push(emiData);
  }

  saveEMIs(emis);
  renderTable();
  closeModal();
});

// Close modal on outside click
document.getElementById("emiModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeModal();
  }
});

// Close seal modal on outside click
document.getElementById("sealModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeSealModal();
  }
});

// Info modal functions
function showSealInfo() {
  const modal = document.getElementById('sealInfoModal');
  modal.classList.add('active');
}

function closeSealInfoModal() {
  const modal = document.getElementById('sealInfoModal');
  modal.classList.remove('active');
}

// Close info modal on outside click
document.getElementById("sealInfoModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeSealInfoModal();
  }
});

// Initialize sort controls
function initSortControls() {
  const prefs = loadSortPrefs();
  document.getElementById("sortBy").value = prefs.sortBy;
  document.getElementById("groupBy").value = prefs.groupBy;
  document.getElementById("sortDirection").textContent =
    prefs.sortDirection === "asc" ? "↑" : "↓";
}

// Reset payment status for new month
function resetPaymentStatusIfNewMonth() {
  const emis = loadEMIs();
  const currentMonth = getCurrentMonth();
  let hasChanges = false;

  emis.forEach((emi) => {
    if (emi.isPaidThisMonth && emi.currentMonth !== currentMonth) {
      emi.isPaidThisMonth = false;
      emi.currentMonth = "";
      hasChanges = true;
    }
  });

  if (hasChanges) {
    saveEMIs(emis);
  }
}

// Initialize app
checkAndUnlockNewMonth(); // Check if new month started
resetPaymentStatusIfNewMonth();
initSortControls();
renderTable();
loadTheme();

// Auto-refresh every minute
setInterval(() => {
  checkAndUnlockNewMonth();
  resetPaymentStatusIfNewMonth();
  renderTable();
}, 60000);

// Theme toggle
function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");

  body.classList.toggle("dark-mode");
  const isDark = body.classList.contains("dark-mode");

  icon.textContent = isDark ? "☀️" : "🌙";
  text.textContent = isDark ? "Light" : "Dark";

  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function loadTheme() {
  const theme = localStorage.getItem("theme");
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");

  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    icon.textContent = "☀️";
    text.textContent = "Light";
  }
}

// Export data
function exportData() {
  const emis = loadEMIs();
  const archived = loadArchived();
  const sealState = loadSealState();
  
  const exportData = {
    active: emis,
    archived: archived,
    sealState: sealState, // Include seal state
    exportDate: new Date().toISOString(),
  };
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `emi-tracker-backup-${
    new Date().toISOString().split("T")[0]
  }.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Import data
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      const currentMonth = getCurrentMonth();

      let activeData = [];
      let archivedData = [];
      let importedSealState = null;
      let exportMonth = null;

      // Handle new export format (with active/archived split)
      if (importedData.active && Array.isArray(importedData.active)) {
        activeData = importedData.active;
        archivedData = importedData.archived || [];
        importedSealState = importedData.sealState || null;
        
        // Extract month from export date
        if (importedData.exportDate) {
          const exportDate = new Date(importedData.exportDate);
          exportMonth = `${exportDate.getFullYear()}-${String(exportDate.getMonth() + 1).padStart(2, "0")}`;
        }
      }
      // Handle old export format (just array)
      else if (Array.isArray(importedData)) {
        activeData = importedData;
      } else {
        alert("Invalid file format");
        event.target.value = "";
        return;
      }

      // Check if export month matches current month
      const isSameMonth = exportMonth === currentMonth;
      let resetMessage = "";

      // Process active data based on month
      activeData = activeData.map((item) => {
        if (isSameMonth) {
          // Same month: preserve payment status for this month
          if (item.isPaidThisMonth && item.currentMonth === currentMonth) {
            return item;
          } else {
            return {
              ...item,
              isPaidThisMonth: false,
              currentMonth: "",
            };
          }
        } else {
          // Different month: reset all payment status
          return {
            ...item,
            isPaidThisMonth: false,
            currentMonth: "",
          };
        }
      });

      // Filter out completed items from active data and move to archive
      const today = new Date();
      const stillActive = [];

      activeData.forEach((item) => {
        if (item.emiEndDate) {
          const endDate = new Date(item.emiEndDate);
          if (endDate < today) {
            archivedData.push({
              ...item,
              archivedDate: new Date().toISOString(),
            });
          } else {
            stillActive.push(item);
          }
        } else {
          stillActive.push(item);
        }
      });

      // Prepare confirmation message
      let confirmMsg = `Import ${stillActive.length} active items and ${archivedData.length} archived items?`;
      if (!isSameMonth && exportMonth) {
        confirmMsg += "\n\n⚠️ Note: Export is from a different month. All payments and seal status will be reset for the new month.";
      }
      confirmMsg += "  This will add to your existing data.";

      if (confirm(confirmMsg)) {
        const existingActive = loadEMIs();
        const existingArchived = loadArchived();

        const mergedActive = [...existingActive, ...stillActive];
        const mergedArchived = [...existingArchived, ...archivedData];

        saveEMIs(mergedActive);
        saveArchived(mergedArchived);

        // Handle seal state import
        if (isSameMonth && importedSealState && importedSealState.isSealed) {
          // Same month: import seal state as-is
          saveSealState(importedSealState);
          applySealedUI();
          resetMessage = "✅ Data imported with seal status preserved!";
        } else if (!isSameMonth && exportMonth) {
          // Different month: clear seal state
          saveSealState({
            isSealed: false,
            sealedMonth: null,
            sealedDate: null,
            sealedItems: []
          });
          removeSealedUI();
          resetMessage = "📅 Month changed! Data imported with payments and seal reset for new entries";
        } else {
          // Old format or no seal: clear seal
          saveSealState({
            isSealed: false,
            sealedMonth: null,
            sealedDate: null,
            sealedItems: []
          });
          removeSealedUI();
          resetMessage = "✅ Data imported successfully!";
        }

        renderTable();
        
        // Show appropriate toast message
        const toast = document.getElementById("paymentToast");
        toast.textContent = resetMessage;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 4000);
      }
    } catch (error) {
      alert("Error reading file: " + error.message);
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}
