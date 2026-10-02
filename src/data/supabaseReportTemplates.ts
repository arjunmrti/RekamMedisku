import { supabase } from "../utils/supabase";
import { getWorkspaceUserId } from "./workspaceStorage";
import type { ReportTemplateDefinition } from "../types/reportTemplate";

export type ReportTemplateSummary = {
  id: string; userId: string; name: string; description: string;
  isArchived: boolean; isSystemOwned: boolean; latestVersion: number;
  latestSchemaVersion: number; latestDefinition?: ReportTemplateDefinition;
  versions?: { version: number; schemaVersion: number; definition: ReportTemplateDefinition }[];
};

type Row = { id:string; user_id:string|null; name:string; description:string; is_archived:boolean; is_system_owned?:boolean; };
type VersionRow = { template_id:string; version:number; schema_version:number; definition:unknown };
const userId = () => { const id=getWorkspaceUserId(); if (!id) throw new Error("Workspace pengguna aktif tidak ditemukan."); return id; };
const validate = (value: unknown): ReportTemplateDefinition => {
  if (!value || typeof value !== "object") throw new Error("Definisi template report tidak valid.");
  const d=value as ReportTemplateDefinition;
  if (!Number.isInteger(d.schema_version) || !Array.isArray(d.sections)) throw new Error("Definisi template report tidak valid.");
  return d;
};
async function currentUser() { const id=userId(); const {data,error}=await supabase.auth.getUser(); if(error) throw error; if(data.user?.id!==id) throw new Error("Sesi pengguna berubah. Operasi template dibatalkan."); return id; }
async function withLatest(rows: Row[], versions: VersionRow[]) {
  const latest=new Map<string,VersionRow>();
  const grouped=new Map<string,{version:number;schemaVersion:number;definition:ReportTemplateDefinition}[]>();
  for(const v of versions) {
    if(!latest.has(v.template_id)) latest.set(v.template_id,v);
    const list=grouped.get(v.template_id)??[];
    list.push({version:v.version,schemaVersion:v.schema_version,definition:validate(v.definition)});
    grouped.set(v.template_id,list);
  }
  return rows.map(r => { const v=latest.get(r.id); return {id:r.id,userId:r.user_id??"",name:r.name,description:r.description,isArchived:r.is_archived,isSystemOwned:r.is_system_owned===true,latestVersion:v?.version??0,latestSchemaVersion:v?.schema_version??0,latestDefinition:v?validate(v.definition):undefined,versions:grouped.get(r.id)??[]}; });
}
export { resolveBoundReportDefinition } from "../utils/reportTemplateBinding";
export async function listReportTemplates() {
  const uid=await currentUser();
  const {data:rows,error}=await supabase.from("templates").select("id,user_id,name,description,is_archived,is_system_owned").eq("type","report").or(`user_id.eq.${uid},is_system_owned.eq.true`).eq("is_archived",false).order("name");
  if(error) throw error; const ids=(rows??[]).map(r=>r.id); if(!ids.length) return [];
  const {data:versions,error:ve}=await supabase.from("template_versions").select("template_id,version,schema_version,definition").in("template_id",ids).order("version",{ascending:false}); if(ve) throw ve;
  return withLatest(rows as Row[], versions as VersionRow[]);
}
export async function cloneSystemReportTemplate(templateId:string,name?:string) { await currentUser(); const {data,error}=await supabase.rpc("clone_system_report_template",{p_template_id:templateId,p_name:name?.trim()||null}); if(error) throw error; return data as {templateId:string;version:number;schemaVersion:number}; }
export async function appendReportTemplateVersion(input:{templateId:string;expectedVersion:number;definition:ReportTemplateDefinition}) { await currentUser(); const definition=validate(input.definition); const {data,error}=await supabase.rpc("append_report_template_version",{p_template_id:input.templateId,p_expected_version:input.expectedVersion,p_schema_version:definition.schema_version,p_definition:definition}); if(error) throw error; return data as {templateId:string;version:number;schemaVersion:number}; }
