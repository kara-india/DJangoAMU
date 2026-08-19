export type DemoRole = 'ADMIN' | 'MANAGER' | 'USER'
export type DemoUser = { id:number; name:string; username:string; email:string; role:DemoRole; manager:number|null }
export type DemoTask = { id:number; title:string; description:string; assigned_to:number; assigned_to_name:string; status:'TODO'|'IN_PROGRESS'|'DONE'; created_at:string; updated_at:string }

const USERS_KEY='taskflow_demo_users_v1'
const TASKS_KEY='taskflow_demo_tasks_v1'
const ME_KEY='taskflow_demo_me_v1'

const now=()=>new Date().toISOString()

function seed(){
  if(!localStorage.getItem(USERS_KEY)){
    const demoUsers:DemoUser[]=[
      {id:1,name:'Alex Morgan',username:'admin',email:'admin@taskflow.demo',role:'ADMIN',manager:null},
      {id:2,name:'Jordan Lee',username:'manager1',email:'manager1@taskflow.demo',role:'MANAGER',manager:null},
      {id:3,name:'Priya Shah',username:'manager2',email:'manager2@taskflow.demo',role:'MANAGER',manager:null},
      {id:4,name:'Sam Wilson',username:'user1',email:'user1@taskflow.demo',role:'USER',manager:2},
      {id:5,name:'Maya Patel',username:'user2',email:'user2@taskflow.demo',role:'USER',manager:2},
      {id:6,name:'Noah Garcia',username:'user3',email:'user3@taskflow.demo',role:'USER',manager:2},
      {id:7,name:'Ava Chen',username:'user4',email:'user4@taskflow.demo',role:'USER',manager:3},
      {id:8,name:'Ethan Brown',username:'user5',email:'user5@taskflow.demo',role:'USER',manager:3},
      {id:9,name:'Sofia Martin',username:'user6',email:'user6@taskflow.demo',role:'USER',manager:3},
    ]
    localStorage.setItem(USERS_KEY,JSON.stringify(demoUsers))
  }
  if(!localStorage.getItem(TASKS_KEY)){
    const ts=now()
    const titles=['Quarterly planning review','Refresh onboarding flow','Close customer feedback loop','Prepare release notes','Audit access permissions','Update product roadmap','Create architecture diagram','Review API documentation','Validate reporting metrics','Plan sprint retrospective','Polish mobile experience','Prepare stakeholder demo']
    const demoTasks:DemoTask[]=titles.map((title,i)=>({
      id:i+1,
      title,
      description:['Align scope, owners and milestones.','Simplify the current experience and remove friction.','Review open feedback and close the highest-impact items.'][i%3],
      assigned_to:4+(i%6),
      assigned_to_name:['Sam Wilson','Maya Patel','Noah Garcia','Ava Chen','Ethan Brown','Sofia Martin'][i%6],
      status:(['TODO','IN_PROGRESS','DONE'] as const)[i%3],
      created_at:ts,
      updated_at:ts,
    }))
    localStorage.setItem(TASKS_KEY,JSON.stringify(demoTasks))
  }
}

function users(){seed();return JSON.parse(localStorage.getItem(USERS_KEY)!) as DemoUser[]}
function tasks(){seed();return JSON.parse(localStorage.getItem(TASKS_KEY)!) as DemoTask[]}
function current(){seed();return users().find(u=>u.username===localStorage.getItem(ME_KEY)) || null}
function saveTasks(v:DemoTask[]){localStorage.setItem(TASKS_KEY,JSON.stringify(v))}

export async function demoApi<T=unknown>(path:string,options:RequestInit={}):Promise<T>{
  seed(); await new Promise(r=>setTimeout(r,120))
  const method=(options.method||'GET').toUpperCase()
  const body=options.body?JSON.parse(String(options.body)):{ }

  if(path==='/token/' && method==='POST'){
    const credentials:{[k:string]:string}={admin:'Admin123!',manager1:'Manager123!',manager2:'Manager123!',user1:'User123!',user2:'User123!',user3:'User123!',user4:'User123!',user5:'User123!',user6:'User123!'}
    if(credentials[String(body.username)]!==String(body.password)) throw new Error('Invalid username or password.')
    localStorage.setItem(ME_KEY,String(body.username))
    return {access:'demo-access-token',refresh:'demo-refresh-token'} as T
  }

  const me=current()
  if(!me) throw new Error('Session expired. Please sign in again.')
  if(path==='/me/' && method==='GET') return {...me,manager:me.manager?users().find(u=>u.id===me.manager)?.username||null:null} as T

  if(path==='/users/' && method==='GET'){
    const visible=me.role==='ADMIN'?users():me.role==='MANAGER'?users().filter(u=>u.manager===me.id||u.id===me.id):users().filter(u=>u.id===me.id)
    return visible as T
  }

  if(path==='/tasks/' && method==='GET'){
    const all=tasks()
    const visible=me.role==='ADMIN'?all:me.role==='MANAGER'?all.filter(t=>t.assigned_to===me.id||users().find(u=>u.id===t.assigned_to)?.manager===me.id):all.filter(t=>t.assigned_to===me.id)
    return visible as T
  }

  if(path==='/tasks/' && method==='POST'){
    if(me.role==='USER') throw new Error('Only Admin or Manager can create tasks.')
    const target=users().find(u=>u.id===Number(body.assigned_to))
    if(!target) throw new Error('Assignee not found.')
    if(me.role==='MANAGER' && target.manager!==me.id && target.id!==me.id) throw new Error('You can only assign tasks to your team members.')
    const stamp=now(); const list=tasks()
    const newTask:DemoTask={id:Math.max(0,...list.map(t=>t.id))+1,title:String(body.title||'Untitled task'),description:String(body.description||''),assigned_to:target.id,assigned_to_name:target.name||target.username,status:body.status||'TODO',created_at:stamp,updated_at:stamp}
    saveTasks([newTask,...list])
    return newTask as T
  }

  const taskMatch=path.match(/^\/tasks\/(\d+)\/$/)
  if(taskMatch){
    const id=Number(taskMatch[1]); const list=tasks(); const idx=list.findIndex(t=>t.id===id)
    if(idx<0) throw new Error('Task not found.')
    const task=list[idx]
    const allowed=me.role==='ADMIN'||task.assigned_to===me.id||(me.role==='MANAGER'&&users().find(u=>u.id===task.assigned_to)?.manager===me.id)
    if(!allowed) throw new Error('You do not have access to this task.')
    if(method==='PATCH'){
      if(me.role==='USER' && Object.keys(body).some(k=>!['title','description','status'].includes(k))) throw new Error('You can only update task details and status.')
      list[idx]={...task,...body,assigned_to_name:task.assigned_to_name,updated_at:now()}
      saveTasks(list)
      return list[idx] as T
    }
    if(method==='DELETE'){
      if(me.role==='USER') throw new Error('You cannot delete tasks.')
      saveTasks(list.filter(t=>t.id!==id))
      return null as T
    }
    return task as T
  }
  throw new Error('Demo endpoint not found.')
}

// Vercel runs only the frontend. When no real API URL is configured, transparently
// emulate the same REST responses in-browser so the deployed demo remains usable.
if(typeof window!=='undefined' && !import.meta.env.VITE_API_URL){
  const nativeFetch=window.fetch.bind(window)
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url
    if(raw.includes('/api/')){
      const url=new URL(raw,window.location.origin)
      try{
        const data=await demoApi(url.pathname.replace(/^\/api/,''),init)
        return new Response(data===null?null:JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}})
      }catch(error){
        return new Response(JSON.stringify({detail:error instanceof Error?error.message:'Request failed'}),{status:403,headers:{'Content-Type':'application/json'}})
      }
    }
    return nativeFetch(input,init)
  }
}
