import { SUBJECTS } from '@/data/subjects'
import SubjectClient from './SubjectClient'

export function generateStaticParams() {
  return SUBJECTS.map(s => ({ id: s.id }))
}

export default function SubjectPage() {
  return <SubjectClient />
}
