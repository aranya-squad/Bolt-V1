#!/usr/bin/env python3
"""Deterministic Bolt AI-SDLC artifact gate checker."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
from typing import Any
ROLES=("product_manager","cto","head_qa"); TASK_DONE={"DONE","SKIPPED_APPROVED"}; AC_DONE={"PASS","NOT_APPLICABLE_APPROVED"}
class GateError(ValueError): pass
def digest(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest()
def req(c,m,e):
    if not c:e.append(m)
def approvals(p):return {x["role"]:x for x in p.get("approvals",[]) if isinstance(x,dict) and isinstance(x.get("role"),str)}
def load(p:Path):
    try:v=json.loads(p.read_text(encoding="utf-8"))
    except (OSError,json.JSONDecodeError) as x:raise GateError(f"cannot read valid JSON plan: {x}") from x
    if not isinstance(v,dict):raise GateError("plan root must be a JSON object")
    return v
def g1(scope,plan):
    e=[]; d=digest(scope); m=plan.get("scope") if isinstance(plan.get("scope"),dict) else {}
    req(m.get("sha256")==d,"scope.sha256 does not match exact scope file bytes",e); req(plan.get("ai_sdlc_version")==1,"ai_sdlc_version must be 1",e); req(plan.get("prospective_only") is True,"prospective_only must be true",e)
    req(bool(m.get("version")),"scope.version is required",e); req(bool(m.get("base_commit")),"scope.base_commit is required",e); b=plan.get("unresolved_blockers"); req(isinstance(b,list) and not b,"unresolved_blockers must be an empty list",e)
    a=approvals(plan)
    for r in ROLES:
        x=a.get(r); req(x is not None,f"missing mandatory approval: {r}",e)
        if x:req(x.get("decision")=="APPROVED",f"{r} decision must be APPROVED",e); req(x.get("scope_sha256")==d,f"{r} approval is stale or for another scope digest",e); req(bool(x.get("agent_id")),f"{r} agent_id is required",e)
    s=plan.get("specialist_reviews",[]); req(isinstance(s,list),"specialist_reviews must be a list",e)
    if isinstance(s,list):
        for x in s:
            if not isinstance(x,dict):e.append("specialist review entries must be objects");continue
            if x.get("required") is True:
                r=x.get("role","specialist");req(x.get("decision")=="APPROVED",f"required specialist {r} must be APPROVED",e);req(x.get("scope_sha256")==d,f"required specialist {r} review is stale",e)
    return e
def collect(p):
    a={x["id"]:x for x in p.get("acceptance",[]) if isinstance(x,dict) and isinstance(x.get("id"),str)};t=[]
    for w in p.get("waves",[]):
        if not isinstance(w,dict):continue
        for c in w.get("categories",[]):
            if not isinstance(c,dict):continue
            for s in c.get("stories",[]):
                if isinstance(s,dict):t.extend(x for x in s.get("tasks",[]) if isinstance(x,dict))
    return a,t
def g2(p):
    e=[];req(p.get("implementation_authorized") is True,"implementation_authorized must be true after G1 approval",e);a,t=collect(p);req(bool(a),"at least one acceptance criterion is required",e);req(bool(t),"at least one executable task is required",e);needs=[]
    for x in p.get("requirements",[]):
        if not isinstance(x,dict):e.append("requirements entries must be objects");continue
        if x.get("kind")=="NEED":
            rid=x.get("id");needs.append(rid) if isinstance(rid,str) else None;acs=x.get("acceptance_ids");req(isinstance(acs,list) and bool(acs),f"NEED {rid or '<missing>'} must map to acceptance IDs",e)
            if isinstance(acs,list):
                for ac in acs:req(ac in a,f"NEED {rid or '<missing>'} references unknown acceptance ID {ac}",e)
    req(bool(needs),"at least one NEED requirement is required",e);seen=set()
    for x in t:
        tid=x.get("id");req(isinstance(tid,str) and bool(tid),"every task needs an id",e)
        if isinstance(tid,str):req(tid not in seen,f"duplicate task id {tid}",e);seen.add(tid)
        req(bool(x.get("title")),f"task {tid or '<missing>'} needs a title",e);req(bool(x.get("owner_class")),f"task {tid or '<missing>'} needs owner_class",e);req(isinstance(x.get("depends_on"),list),f"task {tid or '<missing>'} depends_on must be a list",e);req(isinstance(x.get("writable_paths"),list),f"task {tid or '<missing>'} writable_paths must be a list",e);req(isinstance(x.get("checks"),list) and bool(x.get("checks")),f"task {tid or '<missing>'} must define checks",e);tr=x.get("traceability");req(isinstance(tr,list) and bool(tr),f"task {tid or '<missing>'} must have traceability",e)
        if isinstance(tr,list):
            for z in tr:req(z in a or (isinstance(z,str) and z.startswith("PREREQ:")),f"task {tid or '<missing>'} has unknown traceability ref {z}",e)
    return e
def g5(p):
    e=[];a,t=collect(p)
    for i,x in a.items():
        if x.get("required",True):req(x.get("status") in AC_DONE,f"acceptance {i} has not passed",e)
    for x in t:req(x.get("status") in TASK_DONE,f"task {x.get('id','<missing>')} is not complete",e)
    q=p.get("quality_reviews") if isinstance(p.get("quality_reviews"),dict) else {};req(q.get("code_review")=="PASS","independent code_review must PASS",e);req(q.get("qa_review")=="PASS","qa_review must PASS",e)
    if q.get("security_required") is True:req(q.get("security_review")=="PASS","required security_review must PASS",e)
    u=p.get("publication") if isinstance(p.get("publication"),dict) else {};req(u.get("feature_branch_pushed") is True,"feature branch must be pushed",e);req(bool(u.get("final_commit")),"publication.final_commit is required",e);req(u.get("merged") is False,"AI-SDLC handoff must not mark work merged",e);req(u.get("deployed") is False,"AI-SDLC handoff must not mark work deployed",e);req(p.get("final_status")=="READY FOR HUMAN REVIEW","final_status must be READY FOR HUMAN REVIEW",e);return e
def main():
    x=argparse.ArgumentParser();x.add_argument("--scope",type=Path,required=True);x.add_argument("--plan",type=Path,required=True);x.add_argument("--gate",choices=("G1","G2","G5"),default="G2");a=x.parse_args()
    try:p=load(a.plan);e=g1(a.scope,p);e+=g2(p) if a.gate in {"G2","G5"} else [];e+=g5(p) if a.gate=="G5" else []
    except (GateError,OSError) as z:print(f"ERROR: {z}");return 2
    if e:
        for z in e:print(f"ERROR: {z}")
        return 1
    print(f"PASS: {a.gate} feature gate");return 0
if __name__=="__main__":raise SystemExit(main())
