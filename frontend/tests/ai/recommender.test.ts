import { describe, it, expect } from 'vitest'
import { recommendNext } from '../../src/ai/recommender'
const stub={student:{id:'s1',name:'Ananya'},courses:[{id:'c1',name:'Python Basics',progress:35},{id:'c2',name:'JS Foundations',progress:55},{id:'c3',name:'Intro to AI',progress:10}],attempts:[]}
describe('recommendNext',()=>{
  it('deterministic',()=>{const a=recommendNext(stub);const b=recommendNext(stub);expect(a).toEqual(b)})
  it('prefers lowest progress',()=>{const r=recommendNext(stub);expect(r.id).toBe('c3')})
})