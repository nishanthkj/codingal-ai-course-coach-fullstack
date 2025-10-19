import { describe, it, expect } from 'vitest'
import { analyze } from '../../src/ai/codeChecks'
describe('code checks',()=>{
  it('unused vars',()=>{const code='const a=1; console.log(2)'; expect(analyze(code).some(i=>i.rule==='unused-vars')).toBe(true)})
  it('for-loop off-by-one',()=>{const code='for(let i=0;i<=arr.length;i++){console.log(arr[i])}'; expect(analyze(code).some(i=>i.rule==='for-loop-off-by-one')).toBe(true)})
})