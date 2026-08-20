// ============= Admin Dashboard JavaScript =============

const API = '/api/products';
let allProducts = [];
let allCategories = [];
let deleteProductId = null;

// Accumulated files across multiple picks (fixes "previous files vanish" bug)
let accumulatedFiles = [];
const MAX_IMAGES = 6;

// ------------- Initial Load -------------
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadCategories();
  document.getElementById('productForm').addEventListener('submit', handleSubmit);
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
  setupCategoryDropdown();
});

// ------------- Load Products -------------
async function loadProducts() {
  try {
    const res = await fetch(API + '?limit=100');
    const data = await res.json();
    allProducts = data.products || [];
    renderTable(allProducts);
    document.getElementById('productCount').textContent = `${allProducts.length} product${allProducts.length !== 1 ? 's' : ''} total`;
  } catch (err) {
    showToast('Failed to load products', 'error');
  }
}

// ------------- Render Table -------------
function renderTable(products) {
  const tbody = document.getElementById('productTableBody');
  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-12 text-center">
          <div class="text-4xl mb-3">📦</div>
          <p class="text-surface-500">No products found</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const imgSrc = p.images && p.images.length > 0 && p.images[0].url ? p.images[0].url : '';
    return `
    <tr class="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
      <td class="px-4 py-3">
        <div class="w-12 h-12 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
          ${imgSrc
        ? `<img src="${imgSrc}" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover" />`
        : `<div class="w-full h-full flex items-center justify-center text-surface-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>`
      }
        </div>
      </td>
      <td class="px-4 py-3 font-mono text-sm text-surface-400">${escapeHtml(p.serialNo)}</td>
      <td class="px-4 py-3">
        <div class="font-medium text-white text-sm">${escapeHtml(p.name)}</div>
        ${p.isFeatured ? '<span class="text-xs text-amber-400">⭐ Featured</span>' : ''}
      </td>
      <td class="px-4 py-3 hidden md:table-cell">
        <span class="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium">${escapeHtml(p.category)}</span>
      </td>
      <td class="px-4 py-3 font-medium text-white text-sm">₹${Number(p.price).toLocaleString('en-IN')}</td>
      <td class="px-4 py-3 hidden lg:table-cell">
        <span class="inline-flex items-center gap-1.5 text-xs font-medium ${p.isPublished ? 'text-emerald-400' : 'text-surface-500'}">
          <span class="w-2 h-2 rounded-full ${p.isPublished ? 'bg-emerald-400' : 'bg-surface-600'}"></span>
          ${p.isPublished ? 'Published' : 'Draft'}
        </span>
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center justify-end gap-2">
          ${p.slug ? `<a href="/products/${p.slug}" target="_blank" class="p-2 rounded-lg hover:bg-surface-700 transition-colors text-surface-400 hover:text-emerald-400" title="View public page">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </a>` : ''}
          <button onclick="editProduct('${p._id}')" class="p-2 rounded-lg hover:bg-surface-700 transition-colors text-surface-400 hover:text-brand-400" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="confirmDelete('${p._id}', '${escapeHtml(p.name)}')" class="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-surface-400 hover:text-red-400" title="Delete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ------------- Search -------------
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) { renderTable(allProducts); return; }
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.serialNo.toLowerCase().includes(query) ||
    p.category.toLowerCase().includes(query)
  );
  renderTable(filtered);
}

// ------------- Panel Open/Close -------------
function openPanel(product = null) {
  const panel = document.getElementById('slidePanel');
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('panelTitle');

  resetForm();

  if (product) {
    title.textContent = 'Edit Product';
    document.getElementById('productId').value = product._id;
    document.getElementById('formName').value = product.name || '';
    document.getElementById('formSerialNo').value = product.serialNo || '';
    document.getElementById('formPrice').value = product.price || 0;
    document.getElementById('formCategory').value = product.category || '';
    document.getElementById('formDescription').value = product.description || '';
    document.getElementById('formPublished').checked = product.isPublished !== false;
    document.getElementById('formFeatured').checked = product.isFeatured === true;

    if (product.specifications && Object.keys(product.specifications).length > 0) {
      Object.entries(product.specifications).forEach(([key, val]) => addSpecRow(key, val));
    }

    if (product.images && product.images.length > 0) {
      document.getElementById('existingImages').value = JSON.stringify(product.images);
      const grid = document.getElementById('existingImagesGrid');
      grid.innerHTML = product.images.map((img, idx) => `
        <div class="relative group aspect-square rounded-lg overflow-hidden border border-surface-700">
          <img src="${img.url}" class="w-full h-full object-cover" />
          <button type="button" onclick="removeExistingImage(${idx})" class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      `).join('');
      document.getElementById('existingImagesPreview').classList.remove('hidden');
    }

    document.getElementById('submitBtn').textContent = 'Update Product';
  } else {
    title.textContent = 'Add Product';
    document.getElementById('submitBtn').textContent = 'Save Product';
  }

  panel.classList.add('open');
  overlay.classList.add('active');
}

function closePanel() {
  document.getElementById('slidePanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
}

// ------------- Edit Product -------------
async function editProduct(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error('Failed to fetch product');
    const product = await res.json();
    openPanel(product);
  } catch (err) {
    showToast('Failed to load product details', 'error');
  }
}

// ------------- Remove Existing Image -------------
function removeExistingImage(idx) {
  let images = JSON.parse(document.getElementById('existingImages').value || '[]');
  images.splice(idx, 1);
  document.getElementById('existingImages').value = JSON.stringify(images);

  const grid = document.getElementById('existingImagesGrid');
  if (images.length === 0) {
    document.getElementById('existingImagesPreview').classList.add('hidden');
    grid.innerHTML = '';
  } else {
    grid.innerHTML = images.map((img, i) => `
      <div class="relative group aspect-square rounded-lg overflow-hidden border border-surface-700">
        <img src="${img.url}" class="w-full h-full object-cover" />
        <button type="button" onclick="removeExistingImage(${i})" class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('');
  }
}

// ─── Image helpers ────────────────────────────────────────────────────────────

/**
 * Compress a single File using canvas to fit within maxWidth × maxHeight
 * and quality setting. Returns a Promise<Blob>.
 */
function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.78) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if needed
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => resolve(blob || file),   // fallback to original if toBlob fails
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Accumulate newly picked files into accumulatedFiles (max MAX_IMAGES total).
 * Avoids duplicates by filename. Then re-render the preview grid.
 */
function handleImagePick(input) {
  const existingCount = JSON.parse(document.getElementById('existingImages').value || '[]').length;
  const allowedNew = MAX_IMAGES - existingCount;

  Array.from(input.files).forEach(file => {
    if (
      accumulatedFiles.length < allowedNew &&
      !accumulatedFiles.find(f => f.name === file.name && f.size === file.size)
    ) {
      accumulatedFiles.push(file);
    }
  });

  // Reset the native input value so the same file can be re-picked
  input.value = '';

  renderNewImagesPreview();
  updateImageCounter();
}

function removeNewImage(idx) {
  accumulatedFiles.splice(idx, 1);
  renderNewImagesPreview();
  updateImageCounter();
}

function renderNewImagesPreview() {
  const preview = document.getElementById('newImagesPreview');
  if (accumulatedFiles.length === 0) {
    preview.innerHTML = '';
    return;
  }
  preview.innerHTML = '';
  accumulatedFiles.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'relative group aspect-square rounded-lg overflow-hidden border border-surface-700';
      div.innerHTML = `
        <img src="${e.target.result}" class="w-full h-full object-cover" />
        <button type="button" onclick="removeNewImage(${idx})"
          class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function updateImageCounter() {
  const el = document.getElementById('imageCounter');
  if (!el) return;
  const existingCount = JSON.parse(document.getElementById('existingImages').value || '[]').length;
  const total = existingCount + accumulatedFiles.length;
  el.textContent = `${total} / ${MAX_IMAGES} images`;
  el.className = total >= MAX_IMAGES
    ? 'text-xs text-amber-400 font-medium'
    : 'text-xs text-surface-500';
}

// ─── Form Submit ─────────────────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('productId').value;
  const formData = new FormData();

  formData.append('name', document.getElementById('formName').value);
  formData.append('serialNo', document.getElementById('formSerialNo').value);
  formData.append('price', document.getElementById('formPrice').value || '0');
  formData.append('category', document.getElementById('formCategory').value.trim());
  formData.append('description', document.getElementById('formDescription').value);
  formData.append('isPublished', document.getElementById('formPublished').checked);
  formData.append('isFeatured', document.getElementById('formFeatured').checked);

  const specs = getSpecsFromRows();
  formData.append('specifications', JSON.stringify(specs));

  if (id) {
    formData.append('existingImages', document.getElementById('existingImages').value);
  }

  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Compressing & Saving…';
  submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

  try {
    // Compress all accumulated images before upload
    for (const file of accumulatedFiles) {
      const compressed = await compressImage(file);
      // Give the blob a name so multer can detect the MIME type
      const namedBlob = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      formData.append('images', namedBlob);
    }

    const url = id ? `${API}/${id}` : API;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    showToast(id ? 'Product updated successfully' : 'Product created successfully', 'success');
    closePanel();
    await loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

// ------------- Delete -------------
function confirmDelete(id, name) {
  deleteProductId = id;
  document.getElementById('deleteProductName').textContent = name;
  const modal = document.getElementById('deleteModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.getElementById('confirmDeleteBtn').onclick = performDelete;
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  deleteProductId = null;
}

async function performDelete() {
  if (!deleteProductId) return;

  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  btn.classList.add('opacity-50');

  try {
    const res = await fetch(`${API}/${deleteProductId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');
    showToast('Product deleted successfully', 'success');
    closeDeleteModal();
    await loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
    btn.classList.remove('opacity-50');
  }
}

// ------------- Toast Notifications -------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const colors = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-brand-500/10 border-brand-500/30 text-brand-400',
  };

  const toast = document.createElement('div');
  toast.className = `toast px-5 py-3 rounded-xl border ${colors[type] || colors.info} text-sm font-medium shadow-lg backdrop-blur-xl`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ------------- Reset Form -------------
function resetForm() {
  document.getElementById('productId').value = '';
  document.getElementById('existingImages').value = '[]';
  document.getElementById('formName').value = '';
  document.getElementById('formSerialNo').value = '';
  document.getElementById('formPrice').value = '';
  document.getElementById('formCategory').value = '';
  document.getElementById('formDescription').value = '';
  document.getElementById('specsContainer').innerHTML = '';
  document.getElementById('formPublished').checked = true;
  document.getElementById('formFeatured').checked = false;
  document.getElementById('formImages').value = '';
  document.getElementById('newImagesPreview').innerHTML = '';
  document.getElementById('existingImagesGrid').innerHTML = '';
  document.getElementById('existingImagesPreview').classList.add('hidden');
  accumulatedFiles = [];
  updateImageCounter();
}

// ------------- Spec Row Helpers -------------
function addSpecRow(key = '', value = '') {
  const container = document.getElementById('specsContainer');
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';
  row.innerHTML = `
        <input type="text" placeholder="e.g. Material" value="${escapeHtml(key)}"
            class="flex-1 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-200 placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm spec-key" />
        <input type="text" placeholder="e.g. Metal" value="${escapeHtml(value)}"
            class="flex-1 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-200 placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm spec-value" />
        <button type="button" onclick="this.parentElement.remove()"
            class="p-2 rounded-lg hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-colors flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
    `;
  container.appendChild(row);
}

function getSpecsFromRows() {
  const specs = {};
  document.querySelectorAll('#specsContainer > div').forEach(row => {
    const key = row.querySelector('.spec-key').value.trim();
    const val = row.querySelector('.spec-value').value.trim();
    if (key) specs[key] = val;
  });
  return specs;
}

// ------------- Utilities -------------
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ------------- Category Management -------------
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    allCategories = await res.json();
    renderCategoryDropdown();
  } catch (err) {
    showToast('Failed to load categories', 'error');
  }
}

function renderCategoryDropdown() {
  const list = document.getElementById('categoryList');
  if (!list) return;

  const inputVal = document.getElementById('formCategory').value.trim().toLowerCase();

  // Filter categories based on input wrapper
  const filtered = allCategories.filter(c => c.name.toLowerCase().includes(inputVal));

  if (filtered.length === 0 && inputVal !== '') {
    list.innerHTML = `<li class="px-3 py-2 text-sm text-surface-500 text-center">No matches found</li>`;
  } else {
    list.innerHTML = filtered.map(c => `
          <li class="group flex items-center justify-between px-3 py-2 hover:bg-surface-700 cursor-pointer text-sm text-surface-200" onclick="selectCategory('${escapeHtml(c.name).replace(/'/g, "\\'")}')">
              <span class="flex-1">${escapeHtml(c.name)}</span>
              <button type="button" onclick="deleteCategory('${c._id}', event)" class="p-1 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete category">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
          </li>
      `).join('');
  }
}

function selectCategory(name) {
  document.getElementById('formCategory').value = name;
  document.getElementById('categoryDropdown').classList.add('hidden');
  document.getElementById('categoryAddWrapper').classList.add('hidden');
  // Sync savedCategoryValue so toggle-close restore doesn't overwrite the pick
  // (savedCategoryValue is scoped inside setupCategoryDropdown but this is fine
  //  since the dropdown is already closed here)
}

async function addCategory(name) {
  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add category');
    showToast('Category added', 'success');
    await loadCategories();
    selectCategory(name);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategory(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this category? All products under it will be moved to "Uncategorized".')) return;
  try {
    const res = await fetch('/api/categories/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');
    showToast('Category deleted', 'success');
    await loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function setupCategoryDropdown() {
  const input = document.getElementById('formCategory');
  const toggle = document.getElementById('categoryDropdownBtn');
  const dropdown = document.getElementById('categoryDropdown');
  const wrapper = document.getElementById('categoryWrapper');
  const addWrapper = document.getElementById('categoryAddWrapper');
  const addNameSpan = document.getElementById('newCategoryName');
  const addBtn = document.getElementById('categoryAddBtn');

  if (!input || !toggle) return;

  // Show/hide dropdown on toggle click
  let savedCategoryValue = '';
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      // Save the current value, then clear so we can show the full list
      savedCategoryValue = input.value;
      input.value = '';
      renderCategoryDropdown();
      addWrapper.classList.add('hidden');
      dropdown.classList.remove('hidden');
      input.focus();
    } else {
      // Restore if user closes without picking
      if (!input.value.trim()) input.value = savedCategoryValue;
      dropdown.classList.add('hidden');
    }
  });

  // Show dropdown on focus
  input.addEventListener('focus', () => {
    renderCategoryDropdown();
    dropdown.classList.remove('hidden');
  });

  // Handle typing inside input
  input.addEventListener('input', () => {
    const val = input.value.trim();
    renderCategoryDropdown();

    // Check if value already exists
    const exists = allCategories.find(c => c.name.toLowerCase() === val.toLowerCase());
    if (val && !exists) {
      addNameSpan.textContent = val;
      addWrapper.classList.remove('hidden');
    } else {
      addWrapper.classList.add('hidden');
    }
  });

  // Add category click
  addBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (val) addCategory(val);
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}
