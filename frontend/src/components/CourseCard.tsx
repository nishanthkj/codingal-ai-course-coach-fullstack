import ProgressBar from './ProgressBar'
type Course={id:string;name:string;progress:number;nextUp?:string;lastActivity?:string}
export default function CourseCard({course}:{course:Course}){
return(<div className='rounded-2xl border bg-white p-4 shadow-sm'>
<div className='flex items-center justify-between'><h3 className='text-lg font-semibold'>{course.name}</h3>{course.nextUp&&<span className='text-xs rounded-full bg-indigo-50 px-2 py-1 text-indigo-700'>Next: {course.nextUp}</span>}</div>
<div className='mt-3'><ProgressBar value={course.progress}/><div className='mt-1 text-xs text-gray-600'>Progress: {course.progress}%</div></div>
{course.lastActivity&&<div className='mt-2 text-xs text-gray-500'>Last activity: {course.lastActivity}</div>}
<button className='mt-4 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700'>View Details</button>
</div>) }
