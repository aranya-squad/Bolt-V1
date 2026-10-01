import hashlib,importlib.util,tempfile,unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/"check_feature_gate.py";S=importlib.util.spec_from_file_location("fg",P);assert S and S.loader;M=importlib.util.module_from_spec(S);S.loader.exec_module(M)
def plan(h):
 return {"ai_sdlc_version":1,"prospective_only":True,"scope":{"version":"1","sha256":h,"base_commit":"a"},"unresolved_blockers":[],"approvals":[{"role":"product_manager","agent_id":"p","decision":"APPROVED","scope_sha256":h},{"role":"cto","agent_id":"c","decision":"APPROVED","scope_sha256":h},{"role":"head_qa","agent_id":"q","decision":"APPROVED","scope_sha256":h}],"specialist_reviews":[],"implementation_authorized":True,"requirements":[{"id":"N","kind":"NEED","acceptance_ids":["AC"]}],"acceptance":[{"id":"AC","required":True,"status":"PASS"}],"waves":[{"categories":[{"stories":[{"tasks":[{"id":"T","title":"x","owner_class":"worker","depends_on":[],"writable_paths":["x"],"checks":["x"],"traceability":["AC"],"status":"DONE"}]}]}]}],"quality_reviews":{"code_review":"PASS","qa_review":"PASS","security_required":False},"publication":{"feature_branch_pushed":True,"final_commit":"x","merged":False,"deployed":False},"final_status":"READY FOR HUMAN REVIEW"}
class T(unittest.TestCase):
 def setUp(self):self.d=tempfile.TemporaryDirectory();self.s=Path(self.d.name)/"s";self.s.write_text("scope");self.h=hashlib.sha256(self.s.read_bytes()).hexdigest()
 def tearDown(self):self.d.cleanup()
 def test_valid(self):p=plan(self.h);self.assertEqual([],M.g1(self.s,p));self.assertEqual([],M.g2(p));self.assertEqual([],M.g5(p))
 def test_stale(self):self.assertTrue(M.g1(self.s,plan("0"*64)))
 def test_role(self):p=plan(self.h);p["approvals"].pop();self.assertTrue(M.g1(self.s,p))
 def test_specialist(self):p=plan(self.h);p["specialist_reviews"]=[{"role":"security","required":True,"decision":"BLOCKED","scope_sha256":self.h}];self.assertTrue(M.g1(self.s,p))
 def test_need(self):p=plan(self.h);p["requirements"][0]["acceptance_ids"]=[];self.assertTrue(M.g2(p))
 def test_trace(self):p=plan(self.h);p["waves"][0]["categories"][0]["stories"][0]["tasks"][0]["traceability"]=[];self.assertTrue(M.g2(p))
 def test_incomplete(self):p=plan(self.h);p["waves"][0]["categories"][0]["stories"][0]["tasks"][0]["status"]="IN_PROGRESS";self.assertTrue(M.g5(p))
 def test_no_merge_deploy(self):p=plan(self.h);p["publication"]["merged"]=True;p["publication"]["deployed"]=True;self.assertGreaterEqual(len(M.g5(p)),2)
if __name__=="__main__":unittest.main()
