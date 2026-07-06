'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type Course={id:string;title:string;description:string|null;band_level:number;sort_order:number;is_published:boolean;};
type Lesson={id:string;course_id:string;title:string;summary:string|null;video_url:string|null;writing_task_prompt:string|null;task_type:string;sort_order:number;is_published:boolean;};

const emptyLesson=():Omit<Lesson,'id'>=>({course_id:'',title:'',summary:'',video_url:'',writing_task_prompt:'',task_type:'task2',sort_order:0,is_published:false});

export default function AdminCoursesPage(){
  const supabase=createClient();
  const router=useRouter();
  const [courses,setCourses]=useState<Course[]>([]);
  const [selected,setSelected]=useState<Course|null>(null);
  const [lessons,setLessons]=useState<Lesson[]>([]);
  const [editCourse,setEditCourse]=useState<Partial<Course>>({});
  const [editLesson,setEditLesson]=useState<Partial<Lesson>|null>(null);
  const [isNewLesson,setIsNewLesson]=useState(false);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');
  const [denied,setDenied]=useState(false);

  useEffect(()=>{
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.push('/login');return;}
      const {data:prof}=await supabase.from('profiles').select('role').eq('id',user.id).single();
      if(!prof||!['admin','teacher'].includes(prof.role||'')){setDenied(true);return;}
      loadCourses();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function loadCourses(){
    const {data}=await supabase.from('courses').select('*').order('band_level').order('sort_order');
    setCourses(data||[]);
  }

  async function selectCourse(c:Course){
    setSelected(c);
    setEditCourse(c);
    const {data}=await supabase.from('lessons').select('*').eq('course_id',c.id).order('sort_order');
    setLessons(data||[]);
    setEditLesson(null);setIsNewLesson(false);
  }

  async function saveCourse(){
    setSaving(true);setMsg('');
    if(selected){
      const {error}=await supabase.from('courses').update({...editCourse,updated_at:new Date().toISOString()}).eq('id',selected.id);
      setMsg(error?'❌ '+error.message:'✅ Đã lưu khóa học');
    } else {
      const {data,error}=await supabase.from('courses').insert({...editCourse}).select().single();
      if(data){setSelected(data);setLessons([]);}
      setMsg(error?'❌ '+error.message:'✅ Đã tạo khóa học');
    }
    setSaving(false);loadCourses();
  }

  async function deleteCourse(){
    if(!selected||!confirm('Xóa khóa học và toàn bộ bài học?'))return;
    await supabase.from('courses').delete().eq('id',selected.id);
    setSelected(null);setEditCourse({});setLessons([]);loadCourses();
    setMsg('✅ Đã xóa');
  }

  async function saveLesson(){
    if(!selected||!editLesson)return;
    setSaving(true);setMsg('');
    if(isNewLesson){
      const {error}=await supabase.from('lessons').insert({...editLesson,course_id:selected.id});
      setMsg(error?'❌ '+error.message:'✅ Đã tạo bài học');
    } else {
      const {error}=await supabase.from('lessons').update({...editLesson,updated_at:new Date().toISOString()}).eq('id',(editLesson as Lesson).id);
      setMsg(error?'❌ '+error.message:'✅ Đã lưu bài học');
    }
    setSaving(false);
    const {data}=await supabase.from('lessons').select('*').eq('course_id',selected.id).order('sort_order');
    setLessons(data||[]);setEditLesson(null);setIsNewLesson(false);
  }

  async function deleteLesson(id:string){
    if(!confirm('Xóa bài học này?'))return;
    await supabase.from('lessons').delete().eq('id',id);
    setLessons(prev=>prev.filter(l=>l.id!==id));
    setMsg('✅ Đã xóa bài học');setEditLesson(null);
  }

  if(denied)return(
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <p className="text-red-400 font-mono">Không có quyền truy cập admin.</p>
    </div>
  );

  const Field=({label,value,onChange,type='text',rows=0}:{label:string;value:string|number;onChange:(v:string)=>void;type?:string;rows?:number})=>(
    <div className="mb-3">
      <label className="block text-xs font-mono text-navy-400 mb-1">{label}</label>
      {rows>0
        ? <textarea rows={rows} value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 outline-none resize-y"/>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 outline-none"/>
      }
    </div>
  );

  return(
    <div className="min-h-screen bg-navy-900">
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xs font-mono text-navy-400 hover:text-white">← Dashboard</Link>
            <span className="text-white font-semibold">Admin — Quản lý khóa học</span>
          </div>
          {msg&&<span className="text-xs font-mono text-brand-400">{msg}</span>}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-12 gap-6">
        {/* Course list */}
        <aside className="col-span-3 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono text-navy-400 uppercase tracking-widest">Khóa học</h2>
            <button onClick={()=>{setSelected(null);setEditCourse({band_level:5.0,sort_order:1,is_published:false});setLessons([]);setEditLesson(null);setIsNewLesson(false);setMsg('');}}
              className="text-xs px-2 py-1 rounded bg-brand-500/20 border border-brand-500/40 text-brand-400 hover:bg-brand-500/30">+ Thêm</button>
          </div>
          {courses.map(c=>(
            <button key={c.id} onClick={()=>selectCourse(c)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${selected?.id===c.id?'bg-navy-700 border-brand-500/60 text-white':'bg-navy-800 border-navy-700 text-navy-300 hover:border-navy-600'}`}>
              <span className="font-mono text-brand-400 text-xs">{Number(c.band_level).toFixed(1)}</span> {c.title.slice(0,30)}
              {!c.is_published&&<span className="ml-1 text-[10px] text-navy-500">(ẩn)</span>}
            </button>
          ))}
        </aside>

        {/* Course editor */}
        <section className="col-span-4 bg-navy-800 border border-navy-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">{selected?'Sửa khóa học':'Tạo khóa học mới'}</h2>
            {selected&&<button onClick={deleteCourse} className="text-xs text-red-400 hover:text-red-300 font-mono">Xóa</button>}
          </div>
          <Field label="Tên khóa học" value={editCourse.title||''} onChange={v=>setEditCourse(p=>({...p,title:v}))}/>
          <Field label="Mô tả" value={editCourse.description||''} onChange={v=>setEditCourse(p=>({...p,description:v}))} rows={2}/>
          <Field label="Band level (vd: 5.0)" value={editCourse.band_level||''} onChange={v=>setEditCourse(p=>({...p,band_level:parseFloat(v)||5.0}))}/>
          <Field label="Thứ tự (sort_order)" value={editCourse.sort_order||0} onChange={v=>setEditCourse(p=>({...p,sort_order:parseInt(v)||0}))}/>
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={!!editCourse.is_published} onChange={e=>setEditCourse(p=>({...p,is_published:e.target.checked}))} className="w-4 h-4 rounded"/>
            <span className="text-sm text-navy-300">Công bố (visible cho học viên)</span>
          </label>
          <button onClick={saveCourse} disabled={saving} className="w-full py-2 rounded-lg bg-brand-500 text-navy-900 font-semibold text-sm hover:bg-brand-400 disabled:opacity-50 transition">
            {saving?'Đang lưu...':selected?'Lưu khóa học':'Tạo khóa học'}
          </button>

          {/* Lesson list */}
          {selected&&(
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono text-navy-400 uppercase tracking-widest">Bài học</h3>
                <button onClick={()=>{setEditLesson({...emptyLesson(),course_id:selected.id,sort_order:lessons.length+1});setIsNewLesson(true);}}
                  className="text-xs px-2 py-1 rounded bg-brand-500/20 border border-brand-500/40 text-brand-400 hover:bg-brand-500/30">+ Bài mới</button>
              </div>
              {lessons.map((l,i)=>(
                <button key={l.id} onClick={()=>{setEditLesson(l);setIsNewLesson(false);}}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs mb-1 transition ${editLesson&&(editLesson as Lesson).id===l.id?'bg-navy-700 border-brand-500/60 text-white':'bg-navy-900 border-navy-700 text-navy-400 hover:border-navy-600'}`}>
                  <span className="font-mono text-navy-500 mr-1">{i+1}.</span>{l.title.slice(0,35)}{!l.is_published&&<span className="ml-1 text-navy-600">(ẩn)</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Lesson editor */}
        {editLesson&&(
          <section className="col-span-5 bg-navy-800 border border-navy-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">{isNewLesson?'Tạo bài học mới':'Sửa bài học'}</h2>
              {!isNewLesson&&<button onClick={()=>deleteLesson((editLesson as Lesson).id)} className="text-xs text-red-400 hover:text-red-300 font-mono">Xóa</button>}
            </div>
            <Field label="Tên bài học" value={editLesson.title||''} onChange={v=>setEditLesson(p=>({...p,title:v}))}/>
            <Field label="Tóm tắt" value={editLesson.summary||''} onChange={v=>setEditLesson(p=>({...p,summary:v}))} rows={2}/>
            <Field label="YouTube URL (video bài giảng)" value={editLesson.video_url||''} onChange={v=>setEditLesson(p=>({...p,video_url:v}))}/>
            <Field label="Nội dung bài giảng (markdown)" value={(editLesson as any).content_md||''} onChange={v=>setEditLesson(p=>({...p,content_md:v}))} rows={4}/>
            <Field label="Đề writing" value={editLesson.writing_task_prompt||''} onChange={v=>setEditLesson(p=>({...p,writing_task_prompt:v}))} rows={3}/>
            <div className="mb-3">
              <label className="block text-xs font-mono text-navy-400 mb-1">Task type</label>
              <select value={editLesson.task_type||'task2'} onChange={e=>setEditLesson(p=>({...p,task_type:e.target.value}))}
                className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 outline-none">
                <option value="task2">Task 2 (Essay)</option>
                <option value="task1">Task 1 (Report)</option>
              </select>
            </div>
            <Field label="Thứ tự (sort_order)" value={editLesson.sort_order||0} onChange={v=>setEditLesson(p=>({...p,sort_order:parseInt(v)||0}))}/>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={!!editLesson.is_published} onChange={e=>setEditLesson(p=>({...p,is_published:e.target.checked}))} className="w-4 h-4 rounded"/>
              <span className="text-sm text-navy-300">Công bố bài học</span>
            </label>
            <button onClick={saveLesson} disabled={saving} className="w-full py-2 rounded-lg bg-brand-500 text-navy-900 font-semibold text-sm hover:bg-brand-400 disabled:opacity-50 transition">
              {saving?'Đang lưu...':isNewLesson?'Tạo bài học':'Lưu bài học'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
