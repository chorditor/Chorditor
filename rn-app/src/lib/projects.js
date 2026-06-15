import { getItem, setItem, KEYS } from './storage';
import { genId } from './utils';

// ── 프로젝트 스토리지 ─────────────────────────────────────────────

export async function loadProjects() {
  try {
    const raw = await getItem(KEYS.PROJECTS);
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

export async function saveProjects(projects) {
  await setItem(KEYS.PROJECTS, JSON.stringify(projects));
}

export async function getProject(id) {
  const projects = await loadProjects();
  return projects.find(p => p.id === id) || null;
}

export async function updateProject(updated) {
  const projects = await loadProjects();
  const idx = projects.findIndex(p => p.id === updated.id);
  if (idx !== -1) {
    projects[idx] = updated;
  } else {
    projects.push(updated);
  }
  await saveProjects(projects);
}

export async function createProject(name) {
  const projects = await loadProjects();
  const newProject = {
    id: genId(),
    name,
    pinned: false,
    pinnedOrder: 0,
    important: false,
    importantOrder: 0,
    capo: 0,
    bpm: 120,
    colCount: 4,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chords: [],
    arrangement: [],
  };
  projects.push(newProject);
  await saveProjects(projects);
  return newProject;
}

export async function deleteProject(projectId) {
  const projects = await loadProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  await saveProjects(filtered);
}

// ── 플랜 ──────────────────────────────────────────────────────────

export async function getPlan() {
  const plan = await getItem(KEYS.PLAN);
  return plan || 'free';
}

export async function setPlan(plan) {
  await setItem(KEYS.PLAN, plan);
}
