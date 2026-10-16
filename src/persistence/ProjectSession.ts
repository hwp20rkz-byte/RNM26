import type { ProjectState } from '../types/cad.types';
import { newId } from '../utils/id';
import { parseProjectFile, serializeProject } from './projectFile';
import type { LoadResult, ProjectRepository, SaveResult } from './ProjectRepository';

export type OpenResult = { ok: true; project: ProjectState; warnings: string[] } | { ok: false; error: string };

// Открытый в редакторе проект и ревизия, от которой он редактируется.
// Без React: вся логика сохранения проверяется тестами.
export class ProjectSession {
  private baseRevision: number | null = null;

  constructor(
    readonly repo: ProjectRepository,
    private readonly knownMaterials: ReadonlySet<string>,
  ) {}

  get revision(): number | null {
    return this.baseRevision;
  }

  open(id: string): OpenResult {
    const r: LoadResult = this.repo.load(id);
    if (!r.ok) return r;
    this.baseRevision = r.file.revision;
    this.repo.setLastOpenedId(id);
    return { ok: true, project: r.file.project, warnings: r.warnings };
  }

  // Новый проект сразу пишется в хранилище, чтобы появиться в списке.
  create(project: ProjectState): SaveResult {
    this.baseRevision = null;
    const r = this.save(project);
    if (r.ok) this.repo.setLastOpenedId(project.id);
    return r;
  }

  save(project: ProjectState): SaveResult {
    const r = this.repo.save(project, this.baseRevision);
    if (r.ok) this.baseRevision = r.revision;
    return r;
  }

  // Менеджер решил оставить свою версию поверх изменений из другой вкладки.
  overwrite(project: ProjectState, storedRevision: number): SaveResult {
    this.baseRevision = storedRevision;
    return this.save(project);
  }

  // Импорт никогда не затирает существующий проект: при совпадении id создаётся копия.
  importFile(text: string): OpenResult {
    const parsed = parseProjectFile(text, this.knownMaterials);
    if (!parsed.ok) return parsed;
    let project = parsed.file.project;
    if (this.repo.load(project.id).ok) {
      project = { ...project, id: newId('prj'), name: `${project.name} (импорт)` };
    }
    const r = this.create(project);
    if (!r.ok) return { ok: false, error: r.conflict ? 'Проект с таким id уже есть' : r.error };
    return { ok: true, project, warnings: parsed.warnings };
  }

  exportFile(project: ProjectState): string {
    return serializeProject(project, this.baseRevision ?? 0);
  }
}
