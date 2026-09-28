let currentProjectId = null;
let editingMilestoneId = null;
let editingDeliverableId = null;
let editingUpdateId = null;
let editingTaskId = null;
let editingTextId = null;
let deferredInstallPrompt = null;
const DEFAULT_PROFILE = {name:"Nagesha G",role:"Software Developer",email:"",website:"",location:"",bio:"Software developer who enjoys building simple and useful solutions for real-world problems.",photo:"./assets/profile.jpg",supportQR:"./assets/support-qr.jpg"};
let profileData = {...DEFAULT_PROFILE};

const $ = id => document.getElementById(id);
const nowISO = () => new Date().toISOString();
const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  updateConnectionBadge();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
  await loadProjects();
});

function bindEvents() {
  $("themeBtn").onclick = toggleTheme;
  $("profileBtn").onclick = openProfileModal;
  $("profileForm").onsubmit = saveProfile;
  $("profilePhoto").onchange = previewProfilePhoto;
  $("supportQrFile").onchange = previewSupportQR;
  $("removeQrBtn").onclick = removeSupportQR;
  loadTheme();
  loadProfile();
  $("newProjectBtn").onclick = () => openProjectModal();
  $("heroNewProject").onclick = () => openProjectModal();
  $("backBtn").onclick = showHome;
  $("projectForm").onsubmit = saveProjectFromForm;
  $("milestoneForm").onsubmit = saveMilestoneFromForm;
  $("deliverableForm").onsubmit = saveDeliverableFromForm;
  $("updateForm").onsubmit = saveUpdateFromForm;
  $("taskForm").onsubmit = saveTaskFromForm;
  $("textForm").onsubmit = saveTextItem;
  $("proofForm").onsubmit = saveProof;
  $("addMilestoneBtn").onclick = () => openMilestoneModal();
  $("addDeliverableBtn").onclick = () => openDeliverableModal();
  $("addUpdateBtn").onclick = () => openUpdateModal();
  $("addTaskBtn").onclick = () => openTaskModal();
  $("addBlockerBtn").onclick = () => openTextModal("blocker");
  $("addNextStepBtn").onclick = () => openTextModal("nextStep");
  $("addProofBtn").onclick = () => openModal("proofModal");
  $("deleteProjectBtn").onclick = deleteCurrentProject;
  $("exportJsonBtn").onclick = exportJSON;
  $("exportCsvBtn").onclick = exportCSV;
  $("printReportBtn").onclick = showReportView;
  $("clientViewBtn").onclick = showReportView;
  $("importProjectBtn").onclick = () => $("importFile").click();
  $("importFile").onchange = importJSON;
  $("clearLocalDataBtn").onclick = clearLocalData;
  $("supportBtn").onclick = () => {
    loadProfile();
    if(profileData.supportQR){
      $("supportQrImage").src=profileData.supportQR;
      $("supportQrArea").classList.remove("hidden");
      $("supportNoQr").classList.add("hidden");
    }else{
      $("supportQrArea").classList.add("hidden");
      $("supportNoQr").classList.remove("hidden");
    }
    openModal("supportModal");
  };
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => closeModal(b.dataset.close));
  window.addEventListener("online", updateConnectionBadge);
  window.addEventListener("offline", updateConnectionBadge);
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); deferredInstallPrompt = e; $("installBtn").classList.remove("hidden");
  });
  $("installBtn").onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt = null;
    $("installBtn").classList.add("hidden");
  };
  document.querySelectorAll(".support-amount").forEach(btn => btn.onclick = () => {
    const amount = btn.dataset.amount;
    loadProfile();
    if(profileData.supportQR){
      $("supportQrImage").src=profileData.supportQR;
      $("supportQrArea").classList.remove("hidden");
      $("supportNoQr").classList.add("hidden");
      showToast(`₹${amount} selected — scan the QR if you would like to support.`);
    } else {
      showToast(`₹${amount} selected. Add your QR in Profile → Support setup first.`);
      closeModal("supportModal");
      setTimeout(openProfileModal,120);
    }
  });
}

function updateConnectionBadge() {
  const el = $("connectionBadge");
  const online = navigator.onLine;
  el.textContent = online ? "Browser online • Local data" : "Offline mode";
  el.className = "badge " + (online ? "online" : "offline");
}

async function loadProjects() {
  const projects = await getProjects();
  $("projectCount").textContent = `${projects.length} project${projects.length === 1 ? "" : "s"}`;
  $("projectList").innerHTML = projects.map(projectCard).join("");
  $("emptyState").classList.toggle("hidden", projects.length > 0);
}

function projectCard(p) {
  const progress = calculateProjectProgress(p);
  const deadline = p.deadline ? formatDate(p.deadline) : "No deadline";
  return `<article class="project-card" onclick="openProject('${p.id}')">
    <span class="eyebrow">${escapeHTML(p.status)}</span>
    <h3>${escapeHTML(p.name)}</h3>
    <p>${escapeHTML(p.client)}${p.company ? " • " + escapeHTML(p.company) : ""}<br>${escapeHTML(p.description || "No description")}</p>
    <div class="mini-progress"><i style="width:${progress}%"></i></div>
    <div class="card-meta"><span>${progress}% complete</span><span>${deadline}</span></div>
  </article>`;
}

async function openProject(id) {
  currentProjectId = id;
  $("homeView").classList.add("hidden");
  $("clientView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  await renderDashboard();
}

async function renderDashboard() {
  const p = await getProject(currentProjectId);
  if (!p) return showHome();
  normalizeProject(p);
  const progress = calculateProjectProgress(p);
  p.progress = progress;
  p.status = getProjectStatus(progress);
  $("dashboardProjectName").textContent = p.name;
  $("dashboardClient").textContent = `${p.client}${p.company ? " • " + p.company : ""}`;
  $("progressValue").textContent = `${progress}%`;
  $("progressBar").style.width = `${progress}%`;
  $("projectStatus").textContent = p.status;
  $("clientValue").textContent = p.client || "—";
  $("companyValue").textContent = p.company || "No company";
  $("deadlineValue").textContent = p.deadline ? formatDate(p.deadline) : "No deadline";
  $("deadlineStatus").textContent = deadlineLabel(p.deadline);
  $("milestoneCount").textContent = p.milestones.length;
  $("milestoneSummary").textContent = `${p.milestones.filter(x=>x.status==="Completed").length} completed`;
  $("deliverableCount").textContent = p.deliverables.length;
  $("deliverableSummary").textContent = `${p.deliverables.filter(x=>x.status==="Delivered").length} delivered`;
  $("updateCount").textContent = p.updates.length;
  $("taskCount").textContent = p.tasks.length;
  const doneTasks = p.tasks.filter(t=>t.status === "Done").length;
  $("taskSummary").textContent = p.tasks.length ? `${doneTasks} completed` : "No tasks";
  $("proofCount").textContent = p.proofs.length;
  updateHealthBanner(p, progress);
  renderMilestones(p); renderDeliverables(p); renderTasks(p); renderUpdates(p); renderTextItems(p,"blocker"); renderTextItems(p,"nextStep"); renderProof(p);
  await saveProject(p);
}

function normalizeProject(p) {
  p.milestones ||= []; p.deliverables ||= []; p.updates ||= []; p.tasks ||= []; p.blockers ||= []; p.nextSteps ||= []; p.proofs ||= [];
  p.settings ||= {primaryColor:"#2563eb", showLogo:false};
}

function calculateProjectProgress(p) {
  if (!p.milestones?.length) return Number(p.progress || 0);
  return Math.round(p.milestones.reduce((sum,m)=>sum + Number(m.progress||0),0) / p.milestones.length);
}
function getProjectStatus(progress) {
  if (progress >= 100) return "Completed";
  if (progress > 0) return "In Progress";
  return "Not Started";
}

function openProjectModal() {
  $("projectModalTitle").textContent = "New Project";
  $("projectForm").reset(); $("projectId").value = "";
  openModal("projectModal");
}
async function saveProjectFromForm(e) {
  e.preventDefault();
  const id = $("projectId").value || uid("project");
  const existing = await getProject(id);
  const project = existing || {
    id, progress:0, status:"Not Started", milestones:[], deliverables:[], updates:[], blockers:[], nextSteps:[], proofs:[],
    createdAt:nowISO(), settings:{primaryColor:"#2563eb",showLogo:false}
  };
  Object.assign(project,{
    name:$("projectName").value.trim(), client:$("clientName").value.trim(), company:$("companyName").value.trim(),
    startDate:$("startDate").value, deadline:$("deadline").value, description:$("projectDescription").value.trim(),
    updatedAt:nowISO()
  });
  await saveProject(project); closeModal("projectModal"); showToast("Project saved");
  await loadProjects(); await openProject(id);
}

function openMilestoneModal(id=null) {
  editingMilestoneId = id;
  $("milestoneForm").reset(); $("milestoneId").value = "";
  $("milestoneProgress").value = 0;
  if (id) {
    const p = window.currentProjectCache;
    const m = p?.milestones.find(x=>x.id===id);
    if (!m) return;
    $("milestoneModalTitle").textContent = "Edit Milestone";
    $("milestoneId").value=m.id; $("milestoneName").value=m.name; $("milestoneDescription").value=m.description||"";
    $("milestoneProgress").value=m.progress||0; $("milestoneDue").value=m.dueDate||""; $("milestoneStatus").value=m.status||"Planned";
  } else $("milestoneModalTitle").textContent = "Add Milestone";
  openModal("milestoneModal");
}
async function saveMilestoneFromForm(e) {
  e.preventDefault();
  const p = await getProject(currentProjectId);
  normalizeProject(p);
  const id = $("milestoneId").value || uid("milestone");
  const progress = Math.max(0,Math.min(100,Number($("milestoneProgress").value||0)));
  let status = $("milestoneStatus").value;
  if (progress >= 100) status = "Completed";
  const item = {id,name:$("milestoneName").value.trim(),description:$("milestoneDescription").value.trim(),progress,dueDate:$("milestoneDue").value,status,updatedAt:nowISO()};
  const idx = p.milestones.findIndex(x=>x.id===id);
  idx >= 0 ? p.milestones[idx]=item : p.milestones.push(item);
  p.updatedAt=nowISO(); await saveProject(p); closeModal("milestoneModal"); await renderDashboard(); showToast("Milestone saved");
}
async function editMilestone(id){ openMilestoneModal(id); }
async function removeMilestone(id){ if(!confirm("Delete this milestone?"))return; const p=await getProject(currentProjectId); p.milestones=p.milestones.filter(x=>x.id!==id); await saveProject(p); renderDashboard(); }

function renderMilestones(p) {
  window.currentProjectCache=p;
  const el=$("milestonesList"); $("milestonesEmpty").classList.toggle("hidden",p.milestones.length>0);
  el.innerHTML=p.milestones.map(m=>`<div class="item"><div class="item-main"><div><h3>${escapeHTML(m.name)}</h3><p>${escapeHTML(m.description||"")}</p><span class="status-pill ${statusClass(m.status)}">${escapeHTML(m.status)} • ${m.progress}%</span></div><div class="item-actions"><button class="tiny-btn" onclick="editMilestone('${m.id}')">Edit</button><button class="tiny-btn delete" onclick="removeMilestone('${m.id}')">Delete</button></div></div><div class="progress"><i style="width:${m.progress}%"></i></div><small class="muted">${m.dueDate ? "Due "+formatDate(m.dueDate):"No due date"}</small></div>`).join("");
}

function openDeliverableModal(id=null){
  editingDeliverableId=id; $("deliverableForm").reset(); $("deliverableId").value="";
  if(id){const p=window.currentProjectCache,d=p.deliverables.find(x=>x.id===id); if(!d)return;
    $("deliverableId").value=d.id;$("deliverableName").value=d.name;$("deliverableDescription").value=d.description||"";$("deliverableDue").value=d.dueDate||"";$("deliverableStatus").value=d.status||"Planned";$("deliverableUrl").value=d.url||"";}
  openModal("deliverableModal");
}
async function saveDeliverableFromForm(e){
  e.preventDefault(); const p=await getProject(currentProjectId); normalizeProject(p); const id=$("deliverableId").value||uid("deliverable");
  const item={id,name:$("deliverableName").value.trim(),description:$("deliverableDescription").value.trim(),dueDate:$("deliverableDue").value,status:$("deliverableStatus").value,url:$("deliverableUrl").value.trim(),updatedAt:nowISO()};
  const idx=p.deliverables.findIndex(x=>x.id===id);idx>=0?p.deliverables[idx]=item:p.deliverables.push(item);p.updatedAt=nowISO();await saveProject(p);closeModal("deliverableModal");await renderDashboard();showToast("Deliverable saved");
}
async function editDeliverable(id){openDeliverableModal(id)}
async function removeDeliverable(id){if(!confirm("Delete this deliverable?"))return;const p=await getProject(currentProjectId);p.deliverables=p.deliverables.filter(x=>x.id!==id);await saveProject(p);renderDashboard()}
function renderDeliverables(p){const el=$("deliverablesList");$("deliverablesEmpty").classList.toggle("hidden",p.deliverables.length>0);el.innerHTML=p.deliverables.map(d=>`<div class="item"><div class="item-main"><div><h3>${escapeHTML(d.name)}</h3><p>${escapeHTML(d.description||"")}</p><span class="status-pill ${statusClass(d.status)}">${escapeHTML(d.status)}</span>${d.dueDate?`<small class="muted"> • ${formatDate(d.dueDate)}</small>`:""}</div><div class="item-actions"><button class="tiny-btn" onclick="editDeliverable('${d.id}')">Edit</button><button class="tiny-btn delete" onclick="removeDeliverable('${d.id}')">Delete</button></div></div>${d.url?`<a href="${safeUrl(d.url)}" target="_blank" rel="noopener" class="muted">Open proof ↗</a>`:""}</div>`).join("")}

function openTaskModal(id=null){
  editingTaskId=id; $("taskForm").reset(); $("taskId").value="";
  $("taskPriority").value="Medium"; $("taskStatus").value="Todo";
  const p=window.currentProjectCache;
  if(id){
    const t=p?.tasks.find(x=>x.id===id); if(!t)return;
    $("taskModalTitle").textContent="Edit Task";
    $("taskId").value=t.id; $("taskName").value=t.name||""; $("taskDescription").value=t.description||"";
    $("taskPriority").value=t.priority||"Medium"; $("taskStatus").value=t.status||"Todo"; $("taskDue").value=t.dueDate||""; $("taskAssignee").value=t.assignee||"";
  } else {
    $("taskModalTitle").textContent="Add Task";
  }
  openModal("taskModal");
}
async function saveTaskFromForm(e){
  e.preventDefault();
  const p=await getProject(currentProjectId); if(!p)return; normalizeProject(p);
  const id=$("taskId").value||uid("task");
  const item={id,name:$("taskName").value.trim(),description:$("taskDescription").value.trim(),priority:$("taskPriority").value,status:$("taskStatus").value,dueDate:$("taskDue").value,assignee:$("taskAssignee").value.trim(),createdAt:nowISO(),updatedAt:nowISO()};
  const existing=p.tasks.find(x=>x.id===id); if(existing)item.createdAt=existing.createdAt||item.createdAt;
  if(item.status==="Done") item.completedAt=existing?.completedAt||nowISO(); else delete item.completedAt;
  const idx=p.tasks.findIndex(x=>x.id===id); idx>=0 ? p.tasks[idx]=item : p.tasks.push(item);
  p.tasks.sort((a,b)=>{const ad=a.status==="Done"?1:0,bd=b.status==="Done"?1:0; return ad-bd || new Date(a.dueDate||"9999-12-31")-new Date(b.dueDate||"9999-12-31") || new Date(b.updatedAt)-new Date(a.updatedAt);});
  p.updatedAt=nowISO(); await saveProject(p); closeModal("taskModal"); await renderDashboard(); showToast("Task saved");
}
async function toggleTask(id){
  const p=await getProject(currentProjectId); if(!p)return; normalizeProject(p);
  const t=p.tasks.find(x=>x.id===id); if(!t)return;
  t.status=t.status==="Done"?"Todo":"Done"; t.updatedAt=nowISO(); if(t.status==="Done")t.completedAt=nowISO(); else delete t.completedAt;
  p.updatedAt=nowISO(); await saveProject(p); await renderDashboard(); showToast(t.status==="Done"?"Task completed":"Task reopened");
}
async function editTask(id){openTaskModal(id)}
async function removeTask(id){if(!confirm("Delete this task?"))return; const p=await getProject(currentProjectId); if(!p)return; normalizeProject(p); p.tasks=p.tasks.filter(x=>x.id!==id); p.updatedAt=nowISO(); await saveProject(p); await renderDashboard(); showToast("Task deleted");}
function renderTasks(p){
  const el=$("tasksList"), empty=$("tasksEmpty");
  const tasks=[...p.tasks].sort((a,b)=>{const ad=a.status==="Done"?1:0,bd=b.status==="Done"?1:0;return ad-bd||new Date(a.dueDate||"9999-12-31")-new Date(b.dueDate||"9999-12-31")});
  empty.classList.toggle("hidden",tasks.length>0);
  el.innerHTML=tasks.map(t=>{
    const overdue=t.dueDate && t.status!=="Done" && new Date(t.dueDate+"T23:59:59")<new Date();
    return `<div class="item task-item ${t.status==='Done'?'task-done':''}"><div class="item-main"><div class="task-main"><button class="task-check ${t.status==='Done'?'checked':''}" onclick="toggleTask('${t.id}')" title="${t.status==='Done'?'Reopen task':'Mark task done'}">${t.status==='Done'?'✓':''}</button><div><h3>${escapeHTML(t.name)}</h3><p>${escapeHTML(t.description||"")}</p><div class="task-meta"><span class="status-pill ${statusClass(t.status)}">${escapeHTML(t.status)}</span><span class="priority-pill priority-${statusClass(t.priority)}">${escapeHTML(t.priority)}</span>${t.dueDate?`<span class="muted ${overdue?'overdue':''}">Due ${formatDate(t.dueDate)}</span>`:""}${t.assignee?`<span class="muted">${escapeHTML(t.assignee)}</span>`:""}</div></div></div><div class="item-actions"><button class="tiny-btn" onclick="editTask('${t.id}')">Edit</button><button class="tiny-btn delete" onclick="removeTask('${t.id}')">Delete</button></div></div></div>`;
  }).join("");
}

function openUpdateModal(id=null){
  editingUpdateId=id;$("updateForm").reset();$("updateId").value="";const p=window.currentProjectCache;
  if(id){const u=p.updates.find(x=>x.id===id);if(!u)return;$("updateId").value=u.id;$("updateDate").value=u.date||"";$("updateProgress").value=u.progress??calculateProjectProgress(p);$("updateSummary").value=u.summary||"";$("updateCompleted").value=(u.completed||[]).join("\n");$("updateInProgress").value=(u.inProgress||[]).join("\n");$("updateBlockers").value=(u.blockers||[]).join("\n");$("updateNext").value=(u.next||[]).join("\n");}
  else{$("updateDate").value=new Date().toISOString().slice(0,10);$("updateProgress").value=calculateProjectProgress(p||{milestones:[]});}
  openModal("updateModal");
}
async function saveUpdateFromForm(e){
  e.preventDefault();const p=await getProject(currentProjectId);normalizeProject(p);const id=$("updateId").value||uid("update");
  const lines=s=>s.split("\n").map(x=>x.trim()).filter(Boolean);
  const item={id,date:$("updateDate").value,progress:Math.max(0,Math.min(100,Number($("updateProgress").value||0))),summary:$("updateSummary").value.trim(),completed:lines($("updateCompleted").value),inProgress:lines($("updateInProgress").value),blockers:lines($("updateBlockers").value),next:lines($("updateNext").value),updatedAt:nowISO()};
  const idx=p.updates.findIndex(x=>x.id===id);idx>=0?p.updates[idx]=item:p.updates.push(item);p.updates.sort((a,b)=>new Date(b.date)-new Date(a.date));p.updatedAt=nowISO();await saveProject(p);closeModal("updateModal");await renderDashboard();showToast("Weekly update saved");
}
async function editUpdate(id){openUpdateModal(id)}
async function removeUpdate(id){if(!confirm("Delete this weekly update?"))return;const p=await getProject(currentProjectId);p.updates=p.updates.filter(x=>x.id!==id);await saveProject(p);renderDashboard()}
function renderUpdates(p){const el=$("updatesList");$("updatesEmpty").classList.toggle("hidden",p.updates.length>0);el.innerHTML=p.updates.map(u=>`<article class="item"><div class="item-main"><div><h3>Week ending ${formatDate(u.date)} • ${u.progress}%</h3><p>${escapeHTML(u.summary)}</p></div><div class="item-actions"><button class="tiny-btn" onclick="editUpdate('${u.id}')">Edit</button><button class="tiny-btn delete" onclick="removeUpdate('${u.id}')">Delete</button></div></div><div class="client-columns" style="margin-top:10px"><div><strong>Completed</strong><p>${escapeHTML((u.completed||[]).join("\n")||"—")}</p></div><div><strong>Next week</strong><p>${escapeHTML((u.next||[]).join("\n")||"—")}</p></div></div></article>`).join("")}

function openTextModal(type,id=null){
  editingTextId=id;$("textForm").reset();$("textType").value=type;$("textId").value="";$("textModalEyebrow").textContent=type==="blocker"?"BLOCKER":"NEXT STEP";$("textModalTitle").textContent=type==="blocker"?"Add Blocker":"Add Next Step";
  const p=window.currentProjectCache;if(id){const arr=type==="blocker"?p.blockers:p.nextSteps;const x=arr.find(v=>v.id===id);if(x){$("textId").value=x.id;$("textTitle").value=x.title;$("textDetails").value=x.details||"";$("textModalTitle").textContent="Edit "+(type==="blocker"?"Blocker":"Next Step")}}
  openModal("textModal");
}
async function saveTextItem(e){e.preventDefault();const p=await getProject(currentProjectId);normalizeProject(p);const type=$("textType").value;const arr=type==="blocker"?p.blockers:p.nextSteps;const id=$("textId").value||uid(type);const item={id,title:$("textTitle").value.trim(),details:$("textDetails").value.trim(),createdAt:nowISO()};const idx=arr.findIndex(x=>x.id===id);idx>=0?arr[idx]=item:arr.push(item);p.updatedAt=nowISO();await saveProject(p);closeModal("textModal");renderDashboard();showToast("Saved");
}
async function editTextItem(type,id){openTextModal(type,id)}
async function removeTextItem(type,id){if(!confirm("Delete this item?"))return;const p=await getProject(currentProjectId);const key=type==="blocker"?"blockers":"nextSteps";p[key]=p[key].filter(x=>x.id!==id);await saveProject(p);renderDashboard()}
function renderTextItems(p,type){const key=type==="blocker"?"blockers":"nextSteps";const el=$(type==="blocker"?"blockersList":"nextStepsList");const empty=$(type==="blocker"?"blockersEmpty":"nextStepsEmpty");empty.classList.toggle("hidden",p[key].length>0);el.innerHTML=p[key].map(x=>`<div class="item"><div class="item-main"><div><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.details||"")}</p></div><div class="item-actions"><button class="tiny-btn" onclick="editTextItem('${type}','${x.id}')">Edit</button><button class="tiny-btn delete" onclick="removeTextItem('${type}','${x.id}')">Delete</button></div></div></div>`).join("")}

async function saveProof(e){
  e.preventDefault();const p=await getProject(currentProjectId);normalizeProject(p);const file=$("proofFile").files[0];let imageData="";
  if(file){if(file.size>8*1024*1024&&!confirm("This image is larger than 8 MB and may use a lot of local storage. Continue?"))return;imageData=await readFileAsDataURL(file);}
  p.proofs.push({id:uid("proof"),title:$("proofTitle").value.trim(),note:$("proofNote").value.trim(),url:$("proofUrl").value.trim(),image:imageData,createdAt:nowISO()});
  p.updatedAt=nowISO();await saveProject(p);closeModal("proofModal");$("proofForm").reset();renderDashboard();showToast("Proof saved locally");
}
async function removeProof(id){if(!confirm("Delete this proof item?"))return;const p=await getProject(currentProjectId);p.proofs=p.proofs.filter(x=>x.id!==id);await saveProject(p);renderDashboard()}
function renderProof(p){const el=$("proofList");$("proofEmpty").classList.toggle("hidden",p.proofs.length>0);el.innerHTML=p.proofs.map(x=>`<article class="proof-card">${x.image?`<img src="${x.image}" alt="">`:""}<div class="proof-body"><div class="item-main"><div><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.note||"")}</p>${x.url?`<a href="${safeUrl(x.url)}" target="_blank" rel="noopener">Open link ↗</a>`:""}</div><button class="tiny-btn delete" onclick="removeProof('${x.id}')">Delete</button></div></div></article>`).join("")}

function showReportView(){
  const p=window.currentProjectCache;if(!p)return;
  $("dashboardView").classList.add("hidden");$("homeView").classList.add("hidden");$("reportView").classList.remove("hidden");$("clientView").classList.add("hidden");
  const progress=calculateProjectProgress(p);
  $("reportView").innerHTML=`<div class="client-shell">
  <div class="client-header">
    <div><button class="btn ghost" onclick="backFromReport()">← Back to dashboard</button><span class="eyebrow">CLIENT REPORT</span><h1>${escapeHTML(p.name)}</h1><p>${escapeHTML(p.client)}${p.company?" • "+escapeHTML(p.company):""}</p></div>
    <div class="dashboard-actions"><button class="btn secondary" onclick="backFromReport()">Back</button><button class="btn primary" onclick="window.print()">Save / Print PDF</button></div>
  </div>
  <div class="client-report"><span class="eyebrow">PROJECT HEALTH</span><div class="report-progress">${progress}%</div><div class="report-bar"><i style="width:${progress}%"></i></div><p>${escapeHTML(p.description||"")}</p></div>
  <div class="client-columns">
    <div class="client-report"><h2>Tasks</h2><ul>${p.tasks.map(t=>`<li><strong>${escapeHTML(t.name)}</strong> — ${escapeHTML(t.status)}${t.priority?` • ${escapeHTML(t.priority)}`:""}${t.dueDate?` • Due ${formatDate(t.dueDate)}`:""}</li>`).join("")||"<li>No tasks yet.</li>"}</ul></div>
    <div class="client-report"><h2>Milestones</h2><ul>${p.milestones.map(m=>`<li><strong>${escapeHTML(m.name)}</strong> — ${m.progress}% (${escapeHTML(m.status)})</li>`).join("")||"<li>No milestones yet.</li>"}</ul></div>
    <div class="client-report"><h2>Deliverables</h2><ul>${p.deliverables.map(d=>`<li><strong>${escapeHTML(d.name)}</strong> — ${escapeHTML(d.status)}</li>`).join("")||"<li>No deliverables yet.</li>"}</ul></div>
  </div>
  <div class="client-report"><h2>Weekly updates</h2>${p.updates.map(u=>`<div class="item"><h3>Week ending ${formatDate(u.date)} • ${u.progress}%</h3><p>${escapeHTML(u.summary)}</p><p><strong>Completed:</strong><br>${escapeHTML((u.completed||[]).join("\\n")||"—")}</p><p><strong>Next:</strong><br>${escapeHTML((u.next||[]).join("\\n")||"—")}</p></div>`).join("")||"<p>No updates yet.</p>"}</div>
  <div class="client-report"><h2>Proof & evidence</h2><div class="proof-grid">${p.proofs.map(x=>`<div class="proof-card">${x.image?`<img src="${x.image}" alt="">`:""}<div class="proof-body"><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.note||"")}</p></div></div>`).join("")||"<p>No proof items yet.</p>"}</div></div>
  <div class="footer-note">Prepared with ClientFlow • Built by Nagesha G</div></div>`;
}
function backFromReport(){$("reportView").classList.add("hidden");$("dashboardView").classList.remove("hidden");}
function showClientView(){showReportView()}
function showHome(){$("dashboardView").classList.add("hidden");$("clientView").classList.add("hidden");$("homeView").classList.remove("hidden");currentProjectId=null;loadProjects()}

async function deleteCurrentProject(){const p=await getProject(currentProjectId);if(!p)return;if(!confirm(`Delete "${p.name}" and all its local data? This cannot be undone unless you exported a backup.`))return;await deleteProject(currentProjectId);currentProjectId=null;showHome();showToast("Project deleted")}
async function clearLocalData(){if(!confirm("This deletes ALL projects from this browser. Export backups first. Continue?"))return;await clearAllProjects();showHome();showToast("All local data cleared")}

async function exportJSON(){const p=await getProject(currentProjectId);if(!p)return;downloadBlob(JSON.stringify(p,null,2),`${slug(p.name)}-backup.json`,"application/json");showToast("JSON backup exported")}
async function exportCSV(){const p=await getProject(currentProjectId);if(!p)return;const rows=[["Type","Date","Title","Status/Progress","Details"],...p.milestones.map(x=>["Milestone",x.dueDate,x.name,`${x.status} / ${x.progress}%`,x.description||""]),...p.deliverables.map(x=>["Deliverable",x.dueDate,x.name,x.status,x.description||""]),...p.tasks.map(x=>["Task",x.dueDate,x.name,`${x.status} / ${x.priority}`,`${x.description||""}${x.assignee?" | Assignee: "+x.assignee:""}`]),...p.updates.map(x=>["Weekly Update",x.date,`Week ending ${x.date}`,`${x.progress}%`,x.summary||""]),...p.blockers.map(x=>["Blocker","",x.title,"",x.details||""]),...p.nextSteps.map(x=>["Next Step","",x.title,"",x.details||""])];
const csv=rows.map(r=>r.map(csvCell).join(",")).join("\n");downloadBlob(csv,`${slug(p.name)}-report.csv`,"text/csv;charset=utf-8");showToast("CSV exported")}
async function importJSON(e){const file=e.target.files[0];if(!file)return;try{const p=JSON.parse(await file.text());if(!p.id||!p.name)throw new Error("Invalid backup");p.id=uid("imported");p.createdAt=p.createdAt||nowISO();p.updatedAt=nowISO();normalizeProject(p);await saveProject(p);await loadProjects();showToast("Backup imported")}catch(err){alert("Could not import this file: "+err.message)}e.target.value=""}

function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}
function formatDate(value){if(!value)return"—";const d=new Date(value+"T00:00:00");return d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"})}
function deadlineLabel(value){if(!value)return"No deadline";const diff=Math.ceil((new Date(value+"T23:59:59")-new Date())/86400000);if(diff<0)return`${Math.abs(diff)} day(s) overdue`;if(diff===0)return"Due today";return`${diff} day(s) left`}
function statusClass(s){return String(s||"").toLowerCase().replaceAll(" ","-")}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function safeUrl(url){try{const u=new URL(url);return["http:","https:"].includes(u.protocol)?u.href:"#"}catch{return"#"}}
function slug(s){return String(s||"project").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)}
function csvCell(v){return`"${String(v??"").replaceAll('"','""')}"`}
function downloadBlob(content,name,type){const blob=new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),2500)}

function loadTheme(){const t=localStorage.getItem("clientflow_theme")||"light";document.body.classList.toggle("dark",t==="dark");$("themeBtn").textContent=t==="dark"?"☀":"☾"}
function toggleTheme(){const dark=!document.body.classList.contains("dark");document.body.classList.toggle("dark",dark);localStorage.setItem("clientflow_theme",dark?"dark":"light");$("themeBtn").textContent=dark?"☀":"☾"}
function loadProfile(){
  try {
    const saved=JSON.parse(localStorage.getItem("clientflow_profile")||"null");
    profileData={...DEFAULT_PROFILE,...(saved||{})};
    if(!profileData.photo) profileData.photo=DEFAULT_PROFILE.photo;
    if(!profileData.supportQR) profileData.supportQR=DEFAULT_PROFILE.supportQR;
  } catch { profileData={...DEFAULT_PROFILE}; }
}
function openProfileModal(){loadProfile();$("profileName").value=profileData.name||"";$("profileRole").value=profileData.role||"";$("profileEmail").value=profileData.email||"";$("profileWebsite").value=profileData.website||"";$("profileLocation").value=profileData.location||"";$("profileBio").value=profileData.bio||"";setProfilePreview(profileData.photo);
  setSupportQRPreview(profileData.supportQR);
  openModal("profileModal")}
function previewProfilePhoto(){const f=$("profilePhoto").files[0];if(!f)return;const r=new FileReader();r.onload=()=>setProfilePreview(r.result);r.readAsDataURL(f)}
function setProfilePreview(src){const el=$("profilePreview");if(src){el.style.backgroundImage=`url("${src}")`;el.textContent=""}else{el.style.backgroundImage="";el.textContent=($("profileName")?.value||profileData.name||"N").slice(0,1).toUpperCase()}}
async function saveProfile(e){
  e.preventDefault();
  let photo=profileData.photo;
  let supportQR=profileData.supportQR;
  const f=$("profilePhoto").files[0];
  const qr=$("supportQrFile").files[0];
  if(f)photo=await readFileAsDataURL(f);
  if(qr) {
    if(qr.size>5*1024*1024){showToast("QR image is too large. Please use an image below 5 MB.");return;}
    supportQR=await readFileAsDataURL(qr);
  }
  profileData={
    name:$("profileName").value.trim()||"Nagesha G",
    role:$("profileRole").value.trim(),
    email:$("profileEmail").value.trim(),
    website:$("profileWebsite").value.trim(),
    location:$("profileLocation").value.trim(),
    bio:$("profileBio").value.trim(),
    photo,
    supportQR
  };
  localStorage.setItem("clientflow_profile",JSON.stringify(profileData));
  closeModal("profileModal");
  showToast("Profile and support setup saved locally");
}
function previewSupportQR(){
  const f=$("supportQrFile").files[0];
  if(!f)return;
  if(f.size>5*1024*1024){showToast("Please use a QR image below 5 MB.");$("supportQrFile").value="";return;}
  const r=new FileReader();r.onload=()=>setSupportQRPreview(r.result);r.readAsDataURL(f);
}
function setSupportQRPreview(src){
  const img=$("supportQrPreview"), remove=$("removeQrBtn");
  if(src){img.src=src;img.classList.remove("hidden");remove.classList.remove("hidden")}
  else{img.removeAttribute("src");img.classList.add("hidden");remove.classList.add("hidden")}
}
function removeSupportQR(){
  profileData.supportQR="";
  $("supportQrFile").value="";
  setSupportQRPreview("");
}
function updateHealthBanner(p,progress){let title="On track",text="The project is moving forward.";if(p.blockers.length){title="Needs attention";text=`${p.blockers.length} blocker(s) recorded.`}else if(progress>=100){title="Completed";text="All milestone progress has reached 100%."}else if(p.deadline&&new Date(p.deadline+"T23:59:59")<new Date()&&progress<100){title="Deadline passed";text="Review the deadline and next steps."}$("healthTitle").textContent=title;$("healthText").textContent=text}
function initThree(){if(typeof THREE==="undefined")return;const holder=document.getElementById("threeBackground");const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,100);camera.position.z=9;const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);holder.appendChild(renderer.domElement);const geometry=new THREE.IcosahedronGeometry(3.2,2);const material=new THREE.MeshBasicMaterial({color:0x4f7cff,wireframe:true,transparent:true,opacity:.10});const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);function animate(){requestAnimationFrame(animate);mesh.rotation.x+=.0008;mesh.rotation.y+=.0012;renderer.render(scene,camera)}animate();addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)})}
window.addEventListener("load",initThree);
