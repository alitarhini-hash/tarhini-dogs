(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.TARHINI_SUPABASE || {};
  const setupRequired = $("setup-required"), login = $("login"), app = $("app");
  let client = null, settings = null, menuItems = [], staffMembers = [];
  const bucket = cfg.bucket || "store-media";

  function status(id, message, error = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", error);
  }
  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function slugify(value) {
    return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "menu-item";
  }
  function photoUrl(path) {
    if (!path) return "";
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    if (path.startsWith("image/")) return path;
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add("hidden"), 2800);
  }
  function setConnected(session) {
    const signedIn = Boolean(session);
    login.classList.toggle("hidden", signedIn);
    app.classList.toggle("hidden", !signedIn);
    $("sign-out").classList.toggle("hidden", !signedIn);
  }

  if (!cfg.url || !cfg.publishableKey || !window.supabase?.createClient) {
    setupRequired.classList.remove("hidden");
    return;
  }

  client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });

  async function refresh() {
    status("settings-status", "Loading owner data…");
    const [settingsResult, menuResult, staffResult] = await Promise.all([
      client.from("store_settings").select("*").eq("id", true).single(),
      client.from("menu_items").select("*").order("sort_order", { ascending: true }),
      client.from("staff_members").select("*").order("sort_order", { ascending: true })
    ]);
    const error = settingsResult.error || menuResult.error || staffResult.error;
    if (error) throw error;
    settings = settingsResult.data;
    menuItems = menuResult.data || [];
    staffMembers = staffResult.data || [];
    fillSettings(); renderMenu(); renderStaff(); updateMetrics();
    status("settings-status", "Store details loaded.");
  }

  function updateMetrics() {
    $("metric-menu").textContent = menuItems.filter((item) => item.active).length;
    $("metric-staff").textContent = staffMembers.filter((person) => person.active).length;
    $("metric-status").textContent = "Connected";
  }
  function renderMenu() {
    const root = $("menu-rows");
    root.innerHTML = menuItems.length ? menuItems.map((item) => {
      const image = photoUrl(item.photo_path);
      return '<article class="row-card"><div class="row-main"><span class="thumb">' +
        (image ? '<img src="' + safe(image) + '" alt="">' : safe(item.emoji || "🌭")) +
        '</span><span><b>' + safe(item.name_en) + ' / ' + safe(item.name_ar) + '</b><small>' + safe(item.category) + ' · $' + Number(item.price).toFixed(2) +
        (item.available ? " · Available" : " · Sold out") + '</small></span></div><span class="pill ' + (item.active ? "" : "off") + '">' +
        (item.active ? "On menu" : "Hidden") + '</span><div class="row-actions"><button class="secondary" type="button" data-edit-menu="' + item.id + '">Edit</button><button class="' +
        (item.active ? "danger" : "secondary") + '" type="button" data-toggle-menu="' + item.id + '">' + (item.active ? "Hide" : "Restore") + '</button></div></article>';
    }).join("") : '<p class="empty">No menu items yet. Add the first one to get started.</p>';
  }
  function renderStaff() {
    const root = $("staff-rows");
    root.innerHTML = staffMembers.length ? staffMembers.map((person) => {
      const image = photoUrl(person.photo_path);
      return '<article class="row-card"><div class="row-main"><span class="thumb">' +
        (image ? '<img src="' + safe(image) + '" alt="">' : "👤") + '</span><span><b>' + safe(person.name_en) + ' / ' + safe(person.name_ar) +
        '</b><small>' + safe(person.role_en) + ' / ' + safe(person.role_ar) + '</small></span></div><span class="pill ' + (person.active ? "" : "off") + '">' +
        (person.active ? "On site" : "Hidden") + '</span><div class="row-actions"><button class="secondary" type="button" data-edit-staff="' + person.id + '">Edit</button><button class="' +
        (person.active ? "danger" : "secondary") + '" type="button" data-toggle-staff="' + person.id + '">' + (person.active ? "Hide" : "Restore") + '</button></div></article>';
    }).join("") : '<p class="empty">No team profiles yet. Add your first staff member.</p>';
  }
  function fillSettings() {
    const values = {
      "s-phone": settings.phone, "s-wa": settings.whatsapp_phone, "s-email": settings.email,
      "s-directions": settings.directions_url, "s-address-en": settings.address_en,
      "s-address-ar": settings.address_ar, "s-hours-en": settings.hours_en, "s-hours-ar": settings.hours_ar
    };
    Object.entries(values).forEach(([id, value]) => { $(id).value = value || ""; });
  }
  function openMenu(item) {
    const form = $("menu-form"); form.reset();
    $("m-id").value = item?.id || ""; $("m-slug").value = item?.slug || "";
    $("m-name-en").value = item?.name_en || ""; $("m-name-ar").value = item?.name_ar || "";
    $("m-desc-en").value = item?.description_en || ""; $("m-desc-ar").value = item?.description_ar || "";
    $("m-category").value = item?.category || "dogs"; $("m-price").value = item?.price ?? "";
    $("m-emoji").value = item?.emoji || "🌭"; $("m-sort").value = item?.sort_order ?? ((menuItems.length + 1) * 10);
    $("m-available").checked = item?.available ?? true; $("m-active").checked = item?.active ?? true;
    $("m-photo").value = ""; $("m-photo").dataset.current = item?.photo_path || "";
    $("m-photo-preview").src = photoUrl(item?.photo_path) || "";
    $("m-photo-label").textContent = item?.photo_path ? "Current photo · choose another to replace it." : "Choose a product photo.";
    $("menu-dialog-title").textContent = item ? "Edit menu item" : "Add menu item";
    status("menu-form-status", ""); $("edit-menu").showModal();
  }
  function openStaff(person) {
    $("staff-form").reset();
    $("t-id").value = person?.id || ""; $("t-name-en").value = person?.name_en || "";
    $("t-name-ar").value = person?.name_ar || ""; $("t-role-en").value = person?.role_en || "";
    $("t-role-ar").value = person?.role_ar || ""; $("t-active").checked = person?.active ?? true;
    $("t-photo").value = ""; $("t-photo").dataset.current = person?.photo_path || "";
    $("t-photo-preview").src = photoUrl(person?.photo_path) || "";
    $("t-photo-label").textContent = person?.photo_path ? "Current photo · choose another to replace it." : "Choose a staff photo.";
    $("staff-dialog-title").textContent = person ? "Edit staff member" : "Add staff member";
    status("staff-form-status", ""); $("edit-staff").showModal();
  }
  async function uploadPhoto(file, folder) {
    if (!file) return "";
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
    }
    const ext = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = folder + "/" + crypto.randomUUID() + "." + ext;
    const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return path;
  }
  async function setActive(table, id, active) {
    const { error } = await client.from(table).update({ active, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await refresh(); toast(active ? "Restored on the public site." : "Hidden from the public site.");
  }

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".view").forEach((panel) => panel.classList.toggle("hidden", panel.id !== "view-" + button.dataset.view));
  }));
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => $(button.dataset.close).close()));
  $("add-menu").addEventListener("click", () => openMenu(null));
  $("add-staff").addEventListener("click", () => openStaff(null));
  $("menu-rows").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-menu]"), toggle = event.target.closest("[data-toggle-menu]");
    try {
      if (edit) openMenu(menuItems.find((item) => item.id === edit.dataset.editMenu));
      if (toggle) {
        toggle.disabled = true;
        const item = menuItems.find((entry) => entry.id === toggle.dataset.toggleMenu);
        await setActive("menu_items", item.id, !item.active);
      }
    } catch (error) { toast(error.message || "Could not update the menu."); }
  });
  $("staff-rows").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-staff]"), toggle = event.target.closest("[data-toggle-staff]");
    try {
      if (edit) openStaff(staffMembers.find((person) => person.id === edit.dataset.editStaff));
      if (toggle) {
        toggle.disabled = true;
        const person = staffMembers.find((entry) => entry.id === toggle.dataset.toggleStaff);
        await setActive("staff_members", person.id, !person.active);
      }
    } catch (error) { toast(error.message || "Could not update staff."); }
  });
  $("m-photo").addEventListener("change", () => {
    const file = $("m-photo").files[0];
    if (file) { $("m-photo-preview").src = URL.createObjectURL(file); $("m-photo-label").textContent = file.name; }
  });
  $("t-photo").addEventListener("change", () => {
    const file = $("t-photo").files[0];
    if (file) { $("t-photo-preview").src = URL.createObjectURL(file); $("t-photo-label").textContent = file.name; }
  });
  $("menu-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const button = $("save-menu"); button.disabled = true;
    try {
      status("menu-form-status", "Saving item and photo…");
      const id = $("m-id").value || undefined, oldPhoto = $("m-photo").dataset.current || "";
      const photo = await uploadPhoto($("m-photo").files[0], "menu") || oldPhoto;
      const payload = {
        ...(id ? { id } : {}), slug: $("m-slug").value || slugify($("m-name-en").value),
        name_en: $("m-name-en").value.trim(), name_ar: $("m-name-ar").value.trim(),
        description_en: $("m-desc-en").value.trim(), description_ar: $("m-desc-ar").value.trim(),
        category: $("m-category").value, price: Number($("m-price").value), emoji: $("m-emoji").value.trim() || "🌭",
        photo_path: photo, available: $("m-available").checked, active: $("m-active").checked,
        sort_order: Number($("m-sort").value), updated_at: new Date().toISOString()
      };
      const { error } = await client.from("menu_items").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      await refresh(); $("edit-menu").close(); toast("Menu item saved to the live site.");
    } catch (error) { status("menu-form-status", error.message || "Could not save this item.", true); }
    finally { button.disabled = false; }
  });
  $("staff-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const button = $("save-staff"); button.disabled = true;
    try {
      status("staff-form-status", "Saving staff profile and photo…");
      const id = $("t-id").value || undefined, oldPhoto = $("t-photo").dataset.current || "";
      const photo = await uploadPhoto($("t-photo").files[0], "staff") || oldPhoto;
      const payload = {
        ...(id ? { id } : {}), name_en: $("t-name-en").value.trim(), name_ar: $("t-name-ar").value.trim(),
        role_en: $("t-role-en").value.trim(), role_ar: $("t-role-ar").value.trim(), photo_path: photo,
        active: $("t-active").checked, sort_order: id ? (staffMembers.find((p) => p.id === id)?.sort_order || 0) : (staffMembers.length + 1) * 10,
        updated_at: new Date().toISOString()
      };
      const { error } = await client.from("staff_members").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      await refresh(); $("edit-staff").close(); toast("Staff profile saved to the live site.");
    } catch (error) { status("staff-form-status", error.message || "Could not save this profile.", true); }
    finally { button.disabled = false; }
  });
  $("settings-form").addEventListener("submit", async (event) => {
    event.preventDefault(); status("settings-status", "Saving store details…");
    const payload = {
      id: true, phone: $("s-phone").value.trim(), whatsapp_phone: $("s-wa").value.replace(/\D/g, ""),
      email: $("s-email").value.trim(), directions_url: $("s-directions").value.trim(),
      address_en: $("s-address-en").value.trim(), address_ar: $("s-address-ar").value.trim(),
      hours_en: $("s-hours-en").value.trim(), hours_ar: $("s-hours-ar").value.trim(), updated_at: new Date().toISOString()
    };
    try {
      const { error } = await client.from("store_settings").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      settings = payload; status("settings-status", "Saved. The public site will use these details next load."); toast("Store details saved.");
    } catch (error) { status("settings-status", error.message || "Could not save store details.", true); }
  });
  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("login-email").value.trim().toLowerCase();
    status("login-status", "Sending your one-time sign-in link…");
    try {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      status("login-status", "Check your email for the secure sign-in link. Supabase verifies owner access before allowing edits.");
    } catch (error) { status("login-status", error.message || "Could not send the sign-in link.", true); }
  });
  $("sign-out").addEventListener("click", async () => { await client.auth.signOut(); setConnected(null); });
  function acceptSession(session) {
    if (session && session.user.app_metadata?.store_owner !== true) {
      setConnected(null);
      status("login-status", "This account is not designated as the store owner in Supabase.", true);
      setTimeout(() => client.auth.signOut(), 0);
      return;
    }
    setConnected(session);
    if (session) refresh().catch((error) => toast(error.message || "Could not load store data."));
  }
  client.auth.onAuthStateChange((_event, session) => acceptSession(session));
  client.auth.getSession().then(({ data: { session } }) => acceptSession(session));
})();
