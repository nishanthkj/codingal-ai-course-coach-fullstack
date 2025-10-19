import { useEffect, useState } from 'react'
import CourseCard from '../components/CourseCard'
import { recommendNext } from '../ai/recommender'
import { formatExplanation } from '../ai/explain'
export default function Dashboard(){
  const [courses,setCourses]=useState<any[]>([])
  const [students,setStudents]=useState<any[]>([])
  const [attempts,setAttempts]=useState<any[]>([])
  const [explain,setExplain]=useState<string>('')
  useEffect(()=>{
    Promise.all([fetch('/data/courses.json').then(r=>r.json()),fetch('/data/students.json').then(r=>r.json()),fetch('/data/attempts.json').then(r=>r.json())]).then(([c,s,a])=>{
      setCourses(c);setStudents(s);setAttempts(a);
      const rec=recommendNext({student:s[0],courses:c,attempts:a});setExplain(formatExplanation(rec))
    })
  },[])
  return(<div className='space-y-6'>
    <section><h2 className='mb-3 text-xl font-semibold'>My Courses</h2>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>{courses.map(c=><CourseCard key={c.id} course={c}/>)}</div>
    </section>
    <section className='rounded-2xl border bg-white p-4 shadow-sm'>
      <h2 className='text-lg font-semibold'>AI Course Coach</h2>
      <p className='mt-2 text-sm text-gray-700'>Deterministic local recommendation with human-readable explanation.</p>
      <pre className='mt-3 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs'>{explain}</pre>
    </section>
  </div>)
}