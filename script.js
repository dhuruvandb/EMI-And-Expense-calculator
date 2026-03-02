// LocalStorage Keys
const STORAGE_KEY = "emi_tracker_data";
const SORT_PREFS_KEY = "emi_tracker_sort_prefs";
const ARCHIVED_KEY = "emi_tracker_archived";
const SEAL_STATE_KEY = "emi_tracker_seal_state";

// Global state
let searchQuery = "";
let showArchived = false;
let showPeriodic = false;
let periodicFreqFilter = 'all'; // 'all' | 'quarterly' | 'halfyearly' | 'yearly' | 'custom'
let isSealCountdownActive = false;
let sealCountdownTimer = null;
let undoGracePeriodTimer = null;
let lastSealedItems = []; // Track items sealed in current seal operation
let previousSealState = null; // Store seal state before adding new items (for UNDO)

// Get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ========== PERIODIC PAYMENT HELPERS ==========

const AVG_DAYS_PER_MONTH = 30.44; // Average days per calendar month

// Convert frequency preset to days
function frequencyToDays(frequency, customValue, customUnit) {
  switch (frequency) {
    case 'monthly':    return null;
    case 'quarterly':  return 90;
    case 'halfyearly': return 180;
    case 'yearly':     return 365;
    case 'custom':
      if (customUnit === 'months') return Math.round(parseFloat(customValue) * AVG_DAYS_PER_MONTH);
      if (customUnit === 'days')   return parseInt(customValue);
      return null;
    default: return null;
  }
}

// Get human-readable frequency label
function getFrequencyLabel(frequency, frequencyDays) {
  switch (frequency) {
    case 'monthly':    return 'Monthly';
    case 'quarterly':  return 'Every 3 months';
    case 'halfyearly': return 'Every 6 months';
    case 'yearly':     return 'Yearly';
    case 'custom':     return `Every ${frequencyDays} days`;
    default:           return 'Monthly';
  }
}

// Calculate next due date
function calculateNextDueDate(fromDateStr, frequencyDays) {
  const date = new Date(fromDateStr);
  date.setDate(date.getDate() + frequencyDays);
  return date.toISOString().split('T')[0];
}

// Check if a periodic item is currently due (nextDueDate <= today)
function isPeriodicItemDue(emi) {
  if (!emi.paymentFrequency || emi.paymentFrequency === 'monthly') return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDue = new Date(emi.nextDueDate);
  nextDue.setHours(0, 0, 0, 0);
  return today >= nextDue;
}

// Check if periodic item is paid in its current cycle
function isPaidInCurrentCycle(emi) {
  if (!emi.paymentFrequency || emi.paymentFrequency === 'monthly') {
    return emi.isPaidThisMonth && emi.currentMonth === getCurrentMonth();
  }
  return emi.isPaidThisCycle === true && emi.currentCycleId === emi.nextDueDate;
}

// Toggle visibility of frequency-related form fields
function toggleFrequencyFields() {
  const selected = document.querySelector('input[name="paymentFrequency"]:checked');
  if (!selected) return;
  const freq = selected.value;
  const customFields = document.getElementById('customFrequencyFields');
  const cycleStartGroup = document.getElementById('cycleStartGroup');
  const dueDateGroup = document.getElementById('dueDateGroup');
  const amountLabel = document.getElementById('amountLabel');

  if (freq === 'monthly') {
    customFields.style.display = 'none';
    cycleStartGroup.style.display = 'none';
    dueDateGroup.style.display = 'block';
    // Re-enable dueDate required validation
    const dueDateInput = document.getElementById('dueDate');
    if (dueDateInput) dueDateInput.required = true;
    if (amountLabel) amountLabel.innerHTML = 'Monthly Amount (₹) <span class="required">*</span>';
  } else {
    customFields.style.display = freq === 'custom' ? 'block' : 'none';
    cycleStartGroup.style.display = 'block';
    dueDateGroup.style.display = 'none';
    // Disable dueDate required validation since it's hidden
    const dueDateInput = document.getElementById('dueDate');
    if (dueDateInput) { dueDateInput.required = false; dueDateInput.value = ''; }
    if (amountLabel) amountLabel.innerHTML = 'Payment Amount (₹) <span class="required">*</span>';
  }

  // Update cycle preview
  updateCyclePreview();
}

// Update the cycle preview text based on selected frequency and start date
function updateCyclePreview() {
  const selected = document.querySelector('input[name="paymentFrequency"]:checked');
  if (!selected || selected.value === 'monthly') return;

  const freq = selected.value;
  const cycleStartDateVal = document.getElementById('cycleStartDate').value;
  const preview = document.getElementById('cyclePreview');

  if (!cycleStartDateVal || !preview) return;

  const customValue = document.getElementById('customFreqValue').value;
  const customUnitEl = document.querySelector('input[name="customFreqUnit"]:checked');
  const customUnit = customUnitEl ? customUnitEl.value : 'days';
  const days = frequencyToDays(freq, customValue, customUnit);

  if (days && days > 0) {
    const nextDate = calculateNextDueDate(cycleStartDateVal, days);
    const formatted = formatDate(nextDate);
    preview.textContent = `Next due: ${formatted}`;
    preview.style.display = 'block';
  } else {
    preview.textContent = '';
    preview.style.display = 'none';
  }
}

// Render the periodic payments summary section
function renderPeriodicSummary(periodicItems) {
  const section = document.getElementById('periodicPaymentsSection');
  if (!section) return;
  if (!periodicItems || periodicItems.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  const dueNow = periodicItems.filter(emi => isPeriodicItemDue(emi) && !isPaidInCurrentCycle(emi));
  const paidCycle = periodicItems.filter(emi => isPaidInCurrentCycle(emi));
  const upcoming = periodicItems.filter(emi => !isPeriodicItemDue(emi));

  const dueTotal = dueNow.reduce((s, e) => s + parseFloat(e.emiAmount || 0), 0);

  let html = '';

  if (dueNow.length > 0) {
    html += `<div class="periodic-group-label">Due Now</div>`;
    dueNow.forEach(emi => {
      const freqLabel = getFrequencyLabel(emi.paymentFrequency, emi.frequencyDays);
      const nextDueFormatted = formatDate(emi.nextDueDate);
      html += `<div class="periodic-item due-now">
        <div class="periodic-item-info">
          <span class="periodic-item-name">${emi.emiName}</span>
          <span class="freq-badge">${freqLabel}</span>
          <span class="periodic-item-due">Due: ${nextDueFormatted}</span>
        </div>
        <div class="periodic-item-amount">${formatCurrency(emi.emiAmount)}</div>
        <span class="due-now-badge">Due!</span>
      </div>`;
    });
    html += `<div class="periodic-due-total">Total due now: ${formatCurrency(dueTotal)}</div>`;
  }

  if (paidCycle.length > 0) {
    html += `<div class="periodic-group-label">Paid This Cycle</div>`;
    paidCycle.forEach(emi => {
      const freqLabel = getFrequencyLabel(emi.paymentFrequency, emi.frequencyDays);
      const nextDueFormatted = formatDate(emi.nextDueDate);
      html += `<div class="periodic-item paid-cycle">
        <div class="periodic-item-info">
          <span class="periodic-item-name">${emi.emiName}</span>
          <span class="freq-badge">${freqLabel}</span>
          <span class="periodic-item-due">Cycle ends: ${nextDueFormatted}</span>
        </div>
        <div class="periodic-item-amount">${formatCurrency(emi.emiAmount)}</div>
        <span class="paid-badge">✓ Paid</span>
      </div>`;
    });
  }

  if (upcoming.length > 0) {
    html += `<div class="periodic-group-label">Upcoming</div>`;
    upcoming.forEach(emi => {
      const freqLabel = getFrequencyLabel(emi.paymentFrequency, emi.frequencyDays);
      const nextDueFormatted = formatDate(emi.nextDueDate);
      html += `<div class="periodic-item upcoming">
        <div class="periodic-item-info">
          <span class="periodic-item-name">${emi.emiName}</span>
          <span class="freq-badge">${freqLabel}</span>
          <span class="periodic-item-due">Next due: ${nextDueFormatted}</span>
        </div>
        <div class="periodic-item-amount">${formatCurrency(emi.emiAmount)}</div>
      </div>`;
    });
  }

  document.getElementById('periodicPaymentsList').innerHTML = html;
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
  const unsealedPaidItems = unsealedItems.filter(emi => {
    if (!emi.paymentFrequency || emi.paymentFrequency === 'monthly') {
      return emi.isPaidThisMonth && emi.currentMonth === currentMonth;
    }
    // Periodic: paid this cycle AND currently due
    return emi.isPaidThisCycle && isPeriodicItemDue(emi);
  });
  
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
  
  // Store previous seal state for UNDO functionality
  previousSealState = JSON.parse(JSON.stringify(existingSealState));
  
  // Get existing sealed items or empty array
  const existingSealedItems = (existingSealState.isSealed && existingSealState.sealedMonth === currentMonth)
    ? existingSealState.sealedItems
    : [];
  
  // Add new items to sealed list (only unsealed AND PAID ones)
  const newItemsToSeal = emis
    .filter(emi => {
      if (!wasItemSealed(emi)) {
        // Monthly items
        if (!emi.paymentFrequency || emi.paymentFrequency === 'monthly') {
          return emi.isPaidThisMonth && emi.currentMonth === currentMonth;
        }
        // Periodic items: paid this cycle AND currently due
        return emi.isPaidThisCycle && isPeriodicItemDue(emi);
      }
      return false;
    })
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
  
  // Restore previous seal state (UNDO only the newly added items)
  if (previousSealState) {
    saveSealState(previousSealState);
    previousSealState = null;
  } else {
    // Fallback: if no previous state, clear everything
    saveSealState({
      isSealed: false,
      sealedMonth: null,
      sealedDate: null,
      sealedItems: []
    });
  }
  
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
  previousSealState = null;
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

// Switch between Monthly, Periodic, and Archive views
function switchView(view) {
  // Reset all states
  showArchived = false;
  showPeriodic = false;

  // Set active state
  if (view === 'archive') showArchived = true;
  if (view === 'periodic') showPeriodic = true;

  // Update button active states
  document.getElementById('viewBtnMonthly').classList.toggle('active', view === 'monthly');
  document.getElementById('viewBtnPeriodic').classList.toggle('active', view === 'periodic');
  document.getElementById('viewBtnArchive').classList.toggle('active', view === 'archive');

  // Show/hide frequency filter (only visible in Periodic view)
  const freqFilter = document.getElementById('periodicFreqFilter');
  if (freqFilter) freqFilter.style.display = view === 'periodic' ? 'flex' : 'none';

  // Show/hide archive mode styling
  const tableWrapper = document.getElementById('tableWrapper');
  if (view === 'archive') {
    tableWrapper.classList.add('archive-mode');
  } else {
    tableWrapper.classList.remove('archive-mode');
  }

  // Restore monthly summary labels when switching to monthly view
  if (view === 'monthly') {
    const totalEMIsCard = document.getElementById('totalEMIs');
    if (totalEMIsCard) totalEMIsCard.closest('.summary-card').querySelector('.summary-label').textContent = 'Total Items';
    const totalMonthlyCard = document.getElementById('totalMonthly');
    if (totalMonthlyCard) totalMonthlyCard.closest('.summary-card').querySelector('.summary-label').textContent = 'Monthly Payment';
    const totalDebtCard = document.getElementById('totalDebt');
    if (totalDebtCard) totalDebtCard.closest('.summary-card').querySelector('.summary-label').textContent = 'Total Debt';
    const freedomCard = document.getElementById('freedomCard');
    if (freedomCard) freedomCard.style.display = '';
  }

  renderTable();
}

// Toggle archived view (kept for backward compatibility)
function toggleArchivedView() {
  switchView(showArchived ? 'monthly' : 'archive');
}

// Set periodic frequency filter
function setPeriodicFilter(freq) {
  periodicFreqFilter = freq;

  // Update active button state
  document.querySelectorAll('.freq-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.freq === freq);
  });

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

  const emi = emis[index];

  // PERIODIC ITEM
  if (emi.paymentFrequency && emi.paymentFrequency !== 'monthly') {
    if (!emi.isPaidThisCycle) {
      emis[index].isPaidThisCycle = true;
      emis[index].currentCycleId = emi.nextDueDate;
      saveEMIs(emis);

      const toast = document.getElementById("paymentToast");
      const category = emi.emiCategory || "expense";
      toast.textContent = category === "savings" ? "Thanks for Saving!  💰" : "Thanks for paying! 🎉";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);

      checkAllPaidAndCelebrate();
      renderTable();
    }
    return;
  }

  // MONTHLY ITEM — existing logic unchanged
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
  const paidItems = unsealedItems.filter((emi) => {
    // Monthly
    if (!emi.paymentFrequency || emi.paymentFrequency === 'monthly') {
      return emi.isPaidThisMonth && emi.currentMonth === currentMonth;
    }
    // Periodic: only count if currently due
    if (isPeriodicItemDue(emi)) {
      return isPaidInCurrentCycle(emi);
    }
    return true; // Not yet due = doesn't block celebration
  });

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

  const emi = emis[index];

  // PERIODIC ITEM
  if (emi.paymentFrequency && emi.paymentFrequency !== 'monthly') {
    emis[index].isPaidThisCycle = false;
    saveEMIs(emis);
    renderTable();
    return;
  }

  // MONTHLY ITEM — existing logic unchanged
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
        if (emi.paymentFrequency && emi.paymentFrequency !== 'monthly') {
          groupKey = "🔄 Periodic";
          break;
        }
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
    // Skip periodic items from group total (shown separately)
    if (emi.paymentFrequency && emi.paymentFrequency !== 'monthly') {
      return sum;
    }
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

  let emis;

  if (showArchived) {
    // ARCHIVE VIEW — existing behavior, untouched
    emis = loadArchived();
  } else if (showPeriodic) {
    // PERIODIC VIEW — load only periodic items
    emis = loadEMIs().filter(emi =>
      emi.paymentFrequency && emi.paymentFrequency !== 'monthly'
    );
    // Apply frequency filter
    if (periodicFreqFilter !== 'all') {
      emis = emis.filter(emi => emi.paymentFrequency === periodicFreqFilter);
    }
  } else {
    // MONTHLY VIEW (default) — load only monthly items
    emis = loadEMIs().filter(emi =>
      !emi.paymentFrequency || emi.paymentFrequency === 'monthly'
    );
  }

  const tbody = document.getElementById("emiTableBody");
  const emptyState = document.getElementById("emptyState");

  // Apply search filter
  emis = filterBySearch(emis);

  if (emis.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    // Update empty state messages based on view
    const emptyStateIcon = document.getElementById('emptyStateIcon');
    const emptyStateTitle = document.getElementById('emptyStateTitle');
    const emptyStateDesc = document.getElementById('emptyStateDesc');
    if (showPeriodic) {
      if (emptyStateIcon) emptyStateIcon.textContent = '🔄';
      if (emptyStateTitle) emptyStateTitle.textContent = periodicFreqFilter !== 'all'
        ? `No ${getFrequencyLabel(periodicFreqFilter, null /* frequencyDays not needed for preset labels */)} items`
        : 'No Periodic Payments';
      if (emptyStateDesc) emptyStateDesc.textContent = 'Add an item with a non-monthly frequency to track it here';
    } else if (showArchived) {
      if (emptyStateIcon) emptyStateIcon.textContent = '📦';
      if (emptyStateTitle) emptyStateTitle.textContent = 'No Archived Items';
      if (emptyStateDesc) emptyStateDesc.textContent = 'Completed items will appear here';
    } else {
      if (emptyStateIcon) emptyStateIcon.textContent = '📋';
      if (emptyStateTitle) emptyStateTitle.textContent = 'No Items Added Yet';
      if (emptyStateDesc) emptyStateDesc.textContent = 'Tap the + button below to add your first EMI or expense';
      updateSummary(loadEMIs().filter(emi => !emi.paymentFrequency || emi.paymentFrequency === 'monthly'));
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
    updateSummary(loadEMIs().filter(emi => !emi.paymentFrequency || emi.paymentFrequency === 'monthly'));
    if (!showPeriodic) {
      renderFreedomTimeline(); // Update freedom timeline only in monthly view
    }
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
  const isPaid = isPaidInCurrentCycle(emi);
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

  // Due date display — monthly or periodic
  let dueDateDisplay;
  if (!emi.paymentFrequency || emi.paymentFrequency === 'monthly') {
    dueDateDisplay = `<strong>${emi.dueDate}${getDaySuffix(emi.dueDate)}</strong> of every month`;
  } else {
    const freqLabel = getFrequencyLabel(emi.paymentFrequency, emi.frequencyDays);
    const isDue = isPeriodicItemDue(emi);
    const nextDueFormatted = formatDate(emi.nextDueDate);
    dueDateDisplay = `<strong>${nextDueFormatted}</strong><br><span class="freq-badge">${freqLabel}</span>`;
    if (isDue) dueDateDisplay += ` <span class="due-now-badge">Due!</span>`;
  }

  return `
          <tr class="${rowClass}">
            ${checkboxHtml}
            <td><span style="font-size: 18px;" title="${typeText}">${typeIcon}</span></td>
            <td><strong>${emi.emiName}</strong></td>
            <td class="amount">${formatCurrency(emi.emiAmount)}</td>
            <td class="date">${dueDateDisplay}</td>
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
  if (showPeriodic) {
    updatePeriodicSummary();
    return;
  }
  if (showArchived) {
    return; // existing archive behavior — no summary update
  }

  // MONTHLY VIEW — existing logic completely unchanged
  const currentMonth = getCurrentMonth();
  const totalEMIs = emis.length;

  let totalMonthly = 0;
  let debtAmount = 0;
  let savingsAmount = 0;

  emis.forEach((emi) => {
    // MONTHLY ITEMS — existing logic completely unchanged
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

// Update summary cards for Periodic view
function updatePeriodicSummary() {
  const allPeriodic = loadEMIs().filter(emi =>
    emi.paymentFrequency && emi.paymentFrequency !== 'monthly'
  );

  const dueNow = allPeriodic.filter(emi => isPeriodicItemDue(emi) && !isPaidInCurrentCycle(emi));
  const dueNowTotal = dueNow.reduce((sum, emi) => sum + parseFloat(emi.emiAmount || 0), 0);

  // Find next upcoming due date
  const upcoming = allPeriodic
    .filter(emi => !isPeriodicItemDue(emi))
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
  const nextUpcoming = upcoming[0];

  document.getElementById('totalEMIs').textContent = allPeriodic.length;
  document.getElementById('totalMonthly').textContent = dueNow.length > 0
    ? formatCurrency(dueNowTotal)
    : '₹0';
  document.getElementById('monthlyBreakdown').innerHTML = dueNow.length > 0
    ? `${dueNow.length} payment${dueNow.length > 1 ? 's' : ''} due now`
    : 'Nothing due right now';
  document.getElementById('totalDebt').textContent = nextUpcoming
    ? formatDate(nextUpcoming.nextDueDate)
    : '—';

  // Update labels for periodic context
  document.getElementById('totalEMIs').closest('.summary-card').querySelector('.summary-label').textContent = 'Periodic Items';
  document.getElementById('totalMonthly').closest('.summary-card').querySelector('.summary-label').textContent = 'Due Now';
  document.getElementById('totalDebt').closest('.summary-card').querySelector('.summary-label').textContent = 'Next Due';

  // Hide freedom timeline in periodic view
  const freedomCard = document.getElementById('freedomCard');
  if (freedomCard) freedomCard.style.display = 'none';
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
  // Reset frequency to monthly by default
  const monthlyRadio = document.querySelector('input[name="paymentFrequency"][value="monthly"]');
  if (monthlyRadio) monthlyRadio.checked = true;
  toggleFrequencyFields();
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

    // Populate frequency fields
    const freq = emi.paymentFrequency || 'monthly';
    const freqRadio = document.querySelector(`input[name="paymentFrequency"][value="${freq}"]`);
    if (freqRadio) freqRadio.checked = true;

    if (freq === 'custom' && emi.frequencyDays) {
      document.getElementById('customFreqValue').value = emi.frequencyDays;
      const daysRadio = document.querySelector('input[name="customFreqUnit"][value="days"]');
      if (daysRadio) daysRadio.checked = true;
    }
    if (freq !== 'monthly') {
      document.getElementById('cycleStartDate').value = emi.cycleStartDate || '';
    }
    toggleFrequencyFields();

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

  // Read frequency fields
  const selectedFrequency = (document.querySelector('input[name="paymentFrequency"]:checked') || {}).value || 'monthly';
  let frequencyDays = null;
  let cycleStartDate = null;
  let nextDueDate = null;

  if (selectedFrequency !== 'monthly') {
    const customValue = document.getElementById('customFreqValue').value;
    const customUnitEl = document.querySelector('input[name="customFreqUnit"]:checked');
    const customUnit = customUnitEl ? customUnitEl.value : 'days';
    frequencyDays = frequencyToDays(selectedFrequency, customValue, customUnit);
    cycleStartDate = document.getElementById('cycleStartDate').value;

    // Validate required fields for periodic items
    if (!cycleStartDate) {
      alert('Please enter the First Payment Date for periodic items.');
      return;
    }
    if (selectedFrequency === 'custom' && (!customValue || parseInt(customValue) < 1)) {
      alert('Please enter a valid custom frequency (at least 1).');
      return;
    }

    nextDueDate = calculateNextDueDate(cycleStartDate, frequencyDays);
  }

  const emiData = {
    type: itemType,
    emiCategory: emiCategory,
    emiName: document.getElementById("emiName").value,
    emiAmount: parseFloat(document.getElementById("emiAmount").value),
    dueDate: selectedFrequency === 'monthly' ? parseInt(document.getElementById("dueDate").value) : null,
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
    // Frequency fields (undefined/null for monthly = existing behavior)
    paymentFrequency: selectedFrequency,
    frequencyDays: frequencyDays,
    cycleStartDate: cycleStartDate,
    nextDueDate: nextDueDate,
    currentCycleId: nextDueDate,
    isPaidThisCycle: false,
  };

  const emis = loadEMIs();
  const editIndex = document.getElementById("editIndex").value;

  if (editIndex !== "") {
    // Preserve payment status when editing
    const oldEmi = emis[parseInt(editIndex)];
    emiData.isPaidThisMonth = oldEmi.isPaidThisMonth || false;
    emiData.currentMonth = oldEmi.currentMonth || "";
    // Preserve periodic payment status if frequency unchanged
    if (selectedFrequency !== 'monthly') {
      emiData.isPaidThisCycle = oldEmi.isPaidThisCycle || false;
      emiData.currentCycleId = oldEmi.currentCycleId || nextDueDate;
      // Keep nextDueDate from old item if cycle start didn't change
      if (oldEmi.cycleStartDate === cycleStartDate && oldEmi.frequencyDays === frequencyDays) {
        emiData.nextDueDate = oldEmi.nextDueDate || nextDueDate;
        emiData.currentCycleId = oldEmi.currentCycleId || nextDueDate;
      }
    }
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

// Export info modal functions
function showExportInfo() {
  const modal = document.getElementById('exportInfoModal');
  modal.classList.add('active');
}

function closeExportInfoModal() {
  const modal = document.getElementById('exportInfoModal');
  modal.classList.remove('active');
}

// Close export info modal on outside click
document.getElementById("exportInfoModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeExportInfoModal();
  }
});

// Export warning modal functions
function showExportWarning() {
  const modal = document.getElementById('exportWarningModal');
  modal.classList.add('active');
}

function closeExportWarning() {
  const modal = document.getElementById('exportWarningModal');
  modal.classList.remove('active');
}

// Close export warning modal on outside click
document.getElementById("exportWarningModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeExportWarning();
  }
});

// Data consistency info modal functions
function showDataConsistencyInfo() {
  const modal = document.getElementById('dataConsistencyModal');
  modal.classList.add('active');
}

function closeDataConsistencyInfo() {
  const modal = document.getElementById('dataConsistencyModal');
  modal.classList.remove('active');
}

// Close data consistency modal on outside click
document.getElementById("dataConsistencyModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeDataConsistencyInfo();
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let hasChanges = false;

  emis.forEach((emi) => {
    // MONTHLY ITEMS — existing logic, completely untouched
    if (!emi.paymentFrequency || emi.paymentFrequency === 'monthly') {
      if (emi.isPaidThisMonth && emi.currentMonth !== currentMonth) {
        emi.isPaidThisMonth = false;
        emi.currentMonth = "";
        hasChanges = true;
      }
      return;
    }

    // PERIODIC ITEMS — check if cycle has expired
    if (emi.isPaidThisCycle && emi.nextDueDate && emi.frequencyDays) {
      const cycleEndDate = new Date(emi.nextDueDate);
      cycleEndDate.setDate(cycleEndDate.getDate() + emi.frequencyDays);
      cycleEndDate.setHours(0, 0, 0, 0);

      if (today >= cycleEndDate) {
        // Cycle expired → advance to next cycle
        emi.isPaidThisCycle = false;
        emi.nextDueDate = calculateNextDueDate(emi.nextDueDate, emi.frequencyDays);
        emi.currentCycleId = emi.nextDueDate;
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    saveEMIs(emis);
  }
}

// ========== FINANCIAL FREEDOM TIMELINE ==========

// Calculate Freedom Timeline data
function calculateFreedomTimeline() {
  const emis = loadEMIs();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter active EMIs with end dates (exclude ongoing expenses and savings for freedom calc)
  const activeEMIs = emis.filter(emi => {
    if (!emi.emiEndDate) return false;
    const endDate = new Date(emi.emiEndDate);
    if (endDate < today) return false;
    // Include only debt/expense category for freedom calculation
    return emi.emiCategory === 'expense';
  });
  
  if (activeEMIs.length === 0) {
    return null;
  }
  
  // Sort by end date
  activeEMIs.sort((a, b) => new Date(a.emiEndDate) - new Date(b.emiEndDate));
  
  // Calculate freedom date (last EMI end date)
  const freedomDate = new Date(activeEMIs[activeEMIs.length - 1].emiEndDate);
  
  // Calculate current monthly total
  const currentMonthly = activeEMIs.reduce((sum, emi) => sum + parseFloat(emi.emiAmount || 0), 0);
  
  // Calculate milestones (when each EMI ends)
  const milestones = activeEMIs.map(emi => ({
    date: new Date(emi.emiEndDate),
    name: emi.emiName,
    amount: parseFloat(emi.emiAmount || 0),
    type: emi.type
  }));
  
  // Calculate year-by-year breakdown
  const yearBreakdown = {};
  activeEMIs.forEach(emi => {
    const year = new Date(emi.emiEndDate).getFullYear();
    if (!yearBreakdown[year]) {
      yearBreakdown[year] = { count: 0, items: [] };
    }
    yearBreakdown[year].count++;
    yearBreakdown[year].items.push(emi.emiName);
  });
  
  // Calculate monthly payment over time for graph
  const graphData = [];
  let currentYear = today.getFullYear();
  const lastYear = freedomDate.getFullYear();
  
  for (let year = currentYear; year <= lastYear; year++) {
    // Calculate monthly payment for this year
    let yearlyPayment = activeEMIs
      .filter(emi => new Date(emi.emiEndDate).getFullYear() >= year)
      .reduce((sum, emi) => sum + parseFloat(emi.emiAmount || 0), 0);
    
    graphData.push({
      year: year,
      amount: yearlyPayment
    });
  }
  
  return {
    freedomDate,
    currentMonthly,
    milestones,
    yearBreakdown,
    graphData
  };
}

// Render Freedom Timeline
function renderFreedomTimeline() {
  const freedomCard = document.getElementById('freedomCard');
  const freedomDateSummary = document.getElementById('freedomDateSummary');
  const freedomCountdownSummary = document.getElementById('freedomCountdownSummary');
  
  const data = calculateFreedomTimeline();
  
  if (!data) {
    freedomCard.style.display = 'none';
    return;
  }
  
  freedomCard.style.display = 'flex';
  
  // Format freedom date
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  freedomDateSummary.textContent = `${monthNames[data.freedomDate.getMonth()]} ${data.freedomDate.getDate()}, ${data.freedomDate.getFullYear()}`;
  
  // Calculate countdown
  const today = new Date();
  const diffTime = data.freedomDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);
  const diffMonths = Math.floor((diffDays % 365) / 30);
  
  let countdownText = '';
  if (diffYears > 0) {
    countdownText = `${diffYears}y ${diffMonths}m away`;
  } else if (diffMonths > 0) {
    countdownText = `${diffMonths} months away`;
  } else {
    countdownText = `${diffDays} days away`;
  }
  
  freedomCountdownSummary.textContent = countdownText;
}

// Open Freedom Modal
function openFreedomModal() {
  const data = calculateFreedomTimeline();
  if (!data) return;
  
  const modal = document.getElementById('freedomModal');
  const freedomDateModal = document.getElementById('freedomDateModal');
  const freedomCountdownModal = document.getElementById('freedomCountdownModal');
  const milestonesList = document.getElementById('freedomMilestonesList');
  
  // Format freedom date
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  freedomDateModal.textContent = `${monthNames[data.freedomDate.getMonth()]} ${data.freedomDate.getDate()}, ${data.freedomDate.getFullYear()}`;
  
  // Calculate countdown
  const today = new Date();
  const diffTime = data.freedomDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);
  const diffMonths = Math.floor((diffDays % 365) / 30);
  
  let countdownText = '';
  if (diffYears > 0) {
    const remainingMonths = diffMonths;
    countdownText = `${diffYears} year${diffYears > 1 ? 's' : ''}`;
    if (remainingMonths > 0) {
      countdownText += `, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
    countdownText += ' to freedom';
  } else if (diffMonths > 0) {
    countdownText = `${diffMonths} month${diffMonths > 1 ? 's' : ''} to freedom`;
  } else {
    countdownText = `${diffDays} day${diffDays > 1 ? 's' : ''} to freedom`;
  }
  
  freedomCountdownModal.textContent = countdownText;
  
  // Render milestones (next 5)
  milestonesList.innerHTML = '';
  if (data.milestones.length > 0) {
    const nextMilestones = data.milestones.slice(0, 5);
    nextMilestones.forEach((milestone, index) => {
      const monthYear = `${monthNames[milestone.date.getMonth()]} ${milestone.date.getFullYear()}`;
      const isLast = index === data.milestones.length - 1;
      
      const item = document.createElement('div');
      item.className = 'freedom-milestone-item';
      item.innerHTML = `
        <div class="milestone-info">
          <div class="milestone-name">${milestone.name} ends</div>
          <div class="milestone-date">${monthYear}${isLast ? ' 🎉 (Last EMI!)' : ''}</div>
        </div>
        <div class="milestone-relief">+${formatCurrency(milestone.amount)}/mo</div>
      `;
      milestonesList.appendChild(item);
    });
    
    if (data.milestones.length > 5) {
      const moreText = document.createElement('div');
      moreText.style.textAlign = 'center';
      moreText.style.padding = '12px';
      moreText.style.color = 'var(--text-secondary)';
      moreText.style.fontSize = '0.85rem';
      moreText.textContent = `+ ${data.milestones.length - 5} more EMI${data.milestones.length - 5 > 1 ? 's' : ''} ending later`;
      milestonesList.appendChild(moreText);
    }
  }
  
  modal.classList.add('active');
}

// Close Freedom Modal
function closeFreedomModal() {
  document.getElementById('freedomModal').classList.remove('active');
}

// Initialize app
checkAndUnlockNewMonth(); // Check if new month started
resetPaymentStatusIfNewMonth();
initSortControls();
renderTable();
renderFreedomTimeline(); // Add freedom timeline
loadTheme();

// Auto-refresh every minute
setInterval(() => {
  checkAndUnlockNewMonth();
  resetPaymentStatusIfNewMonth();
  renderTable();
  renderFreedomTimeline(); // Update freedom timeline
}, 60000);

// Theme toggle
function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");

  body.classList.toggle("dark-mode");
  const isDark = body.classList.contains("dark-mode");

  icon.textContent = isDark ? "🌙" : "☀️";
  text.textContent = isDark ? "Dark" : "Light";

  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function loadTheme() {
  const theme = localStorage.getItem("theme");
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");

  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    icon.textContent = "🌙";
    text.textContent = "Dark";
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

  // Pre-validate file size
  if (file.size === 0) {
    showImportError('empty', 'File is empty (0 bytes)', file.size);
    event.target.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    showImportError('too-large', 'File is too large (max 10MB)', file.size);
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const fileContent = e.target.result;
      
      // Pre-validate file content
      if (!fileContent || typeof fileContent !== 'string') {
        showImportError('invalid', 'File content is not text', file.size);
        event.target.value = "";
        return;
      }

      if (fileContent.trim().length < 10) {
        showImportError('empty', 'File is too short to be valid', file.size);
        event.target.value = "";
        return;
      }

      // Try to parse JSON
      let importedData;
      try {
        importedData = JSON.parse(fileContent);
      } catch (parseError) {
        // Categorize JSON syntax errors
        const errorMsg = parseError.message || '';
        if (errorMsg.includes('position') || errorMsg.includes('line') || errorMsg.includes('Unexpected')) {
          showImportError('syntax', parseError.message, file.size);
        } else {
          showImportError('corrupted', parseError.message, file.size);
        }
        event.target.value = "";
        return;
      }

      // Validate data type
      if (typeof importedData !== 'object' || importedData === null) {
        showImportError('wrong-format', 'File is not a valid JSON object', file.size);
        event.target.value = "";
        return;
      }

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
        showImportError('wrong-app', "File structure doesn't match this app's format", file.size);
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
          if (!item.paymentFrequency || item.paymentFrequency === 'monthly') {
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
            // Periodic item: preserve as-is
            return item;
          }
        } else {
          // Different month: reset all payment status
          if (!item.paymentFrequency || item.paymentFrequency === 'monthly') {
            return {
              ...item,
              isPaidThisMonth: false,
              currentMonth: "",
            };
          } else {
            // Periodic item: reset cycle paid status
            return {
              ...item,
              isPaidThisCycle: false,
            };
          }
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

      // Store import data for confirmation
      window.pendingImportData = {
        stillActive,
        archivedData,
        isSameMonth,
        exportMonth,
        importedSealState
      };

      // Show confirmation modal
      showImportConfirmModal(stillActive.length, archivedData.length, isSameMonth, exportMonth);
    } catch (error) {
      showImportError('unknown', error.message, file.size);
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

// Show import confirmation modal
function showImportConfirmModal(activeCount, archivedCount, isSameMonth, exportMonth) {
  const modal = document.getElementById('importConfirmModal');
  document.getElementById('importActiveCount').textContent = activeCount;
  document.getElementById('importArchivedCount').textContent = archivedCount;
  
  const monthWarning = document.getElementById('importMonthWarning');
  if (!isSameMonth && exportMonth) {
    monthWarning.style.display = 'block';
  } else {
    monthWarning.style.display = 'none';
  }
  
  modal.classList.add('active');
}

function closeImportConfirmModal() {
  const modal = document.getElementById('importConfirmModal');
  modal.classList.remove('active');
  window.pendingImportData = null;
}

// Close import confirm modal on outside click
document.getElementById("importConfirmModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeImportConfirmModal();
  }
});

// Execute the actual import after confirmation
function confirmImport() {
  const pendingData = window.pendingImportData; // ✅ Save reference FIRST

  closeImportConfirmModal(); // Now it's safe to clear window.pendingImportData

  if (!pendingData) return;

  const {
    stillActive,
    archivedData,
    isSameMonth,
    exportMonth,
    importedSealState,
  } = pendingData;
  
  let resetMessage = "";
  
  try {
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
  } catch (importError) {
    showImportError('import-failed', importError.message, 0);
  }
  
  window.pendingImportData = null;
}

// Show user-friendly import error modal
function showImportError(errorType, errorMessage, fileSize) {
  const modal = document.getElementById('importErrorModal');
  const titleEl = document.getElementById('importErrorTitle');
  const causesEl = document.getElementById('importErrorCauses');
  const errorTypeEl = document.getElementById('errorType');
  const errorMessageEl = document.getElementById('errorMessage');
  const fileSizeEl = document.getElementById('fileSize');

  // Update technical details
  errorTypeEl.textContent = errorType;
  errorMessageEl.textContent = errorMessage;
  fileSizeEl.textContent = fileSize ? `${fileSize} bytes` : 'Unknown';

  // Customize message based on error type
  switch(errorType) {
    case 'empty':
      titleEl.innerHTML = '⚠️ <strong>The file is empty or invalid</strong>';
      causesEl.innerHTML = `
        <li>❌ Downloaded file is incomplete</li>
        <li>❌ Export process was interrupted</li>
        <li>❌ File was cleared or corrupted</li>
      `;
      break;

    case 'too-large':
      titleEl.innerHTML = '⚠️ <strong>The file is too large</strong>';
      causesEl.innerHTML = `
        <li>❌ Not a backup file from this app</li>
        <li>❌ File contains extra data</li>
        <li>❌ Wrong file selected</li>
      `;
      break;

    case 'syntax':
      titleEl.innerHTML = '⚠️ <strong>The file has JSON syntax errors</strong>';
      causesEl.innerHTML = `
        <li>❌ File was manually edited in text editor</li>
        <li>❌ Missing comma, bracket, or quote</li>
        <li>❌ Download corrupted or incomplete</li>
        <li>❌ Copy-paste error from browser</li>
      `;
      break;

    case 'wrong-format':
    case 'wrong-app':
      titleEl.innerHTML = '⚠️ <strong>This is not a backup file from this app</strong>';
      causesEl.innerHTML = `
        <li>❌ Wrong file selected</li>
        <li>❌ File from different app</li>
        <li>❌ File structure doesn't match</li>
        <li>❌ Very old backup format (unsupported)</li>
      `;
      break;

    case 'corrupted':
      titleEl.innerHTML = '⚠️ <strong>The file appears to be corrupted</strong>';
      causesEl.innerHTML = `
        <li>❌ File damaged during transfer</li>
        <li>❌ Storage device error</li>
        <li>❌ Incomplete download</li>
        <li>❌ Cloud sync conflict</li>
      `;
      break;

    case 'import-failed':
      titleEl.innerHTML = '⚠️ <strong>Import process failed</strong>';
      causesEl.innerHTML = `
        <li>❌ Data validation failed</li>
        <li>❌ Required fields missing</li>
        <li>❌ Internal processing error</li>
      `;
      break;

    default:
      titleEl.innerHTML = '⚠️ <strong>Unknown error occurred</strong>';
      causesEl.innerHTML = `
        <li>❌ Unexpected error during import</li>
        <li>❌ Please try again or use different file</li>
      `;
  }

  // Reset technical details visibility
  document.getElementById('technicalDetailsSection').style.display = 'none';
  document.getElementById('techDetailsToggle').textContent = 'Show Technical Details ▼';

  // Show modal
  modal.classList.add('active');
}

function closeImportErrorModal() {
  document.getElementById('importErrorModal').classList.remove('active');
}

function toggleTechnicalDetails() {
  const section = document.getElementById('technicalDetailsSection');
  const toggle = document.getElementById('techDetailsToggle');
  
  if (section.style.display === 'none') {
    section.style.display = 'block';
    toggle.textContent = 'Hide Technical Details ▲';
  } else {
    section.style.display = 'none';
    toggle.textContent = 'Show Technical Details ▼';
  }
}
