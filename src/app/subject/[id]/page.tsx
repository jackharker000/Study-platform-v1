import SubjectClient from './SubjectClient'

// No generateStaticParams needed — dynamic routing works natively with Vercel SSR
export default function SubjectPage() {
  return <SubjectClient />
}
