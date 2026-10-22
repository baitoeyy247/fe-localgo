import { Routes } from '@angular/router';
import { GLOSSARY } from '../i18n/glossary';
import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';
import { dirtyFormCanDeactivate } from './shared/forms/dirty-form.guard';

const formGuard = { canDeactivate: [dirtyFormCanDeactivate] };

export const routes: Routes = [
  {
    path: '',
    title: 'LocalGo',
    pathMatch: 'full',
    loadComponent: () => import('./pages/entry/entry').then((m) => m.EntryPage),
  },
  {
    path: 'login',
    pathMatch: 'full',
    redirectTo: '',
  },
  {
    path: 'requester',
    title: 'หน้าหลัก | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/home/requester-home').then((m) => m.RequesterHomePage),
  },
  {
    path: 'requester/requests/:id',
    title: 'รายละเอียดงาน | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/request-detail/requester-request-detail').then(
        (m) => m.RequesterRequestDetailPage,
      ),
  },
  {
    path: 'requester/search',
    title: 'ค้นหาบริการ | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/search/requester-search').then((m) => m.RequesterSearchPage),
  },
  {
    path: 'requester/provider/:id',
    title: 'โปรไฟล์ผู้ให้บริการ | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/provider-profile/provider-profile').then((m) => m.ProviderProfilePage),
  },
  {
    path: 'requester/post',
    title: 'ประกาศงาน | LocalGo',
    canActivate: [authGuard],
    ...formGuard,
    loadComponent: () =>
      import('./pages/requester/post-request/post-request').then((m) => m.PostRequestPage),
  },
  {
    path: 'requester/bids',
    title: 'ข้อเสนอที่ได้รับ | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/private-bids/private-bids').then((m) => m.PrivateBidsPage),
  },
  {
    path: 'requester/profile',
    title: 'บัญชี | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/profile/requester-profile').then((m) => m.RequesterProfilePage),
  },
  {
    path: 'requester/book/:providerId',
    title: 'จองบริการ | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/book/book').then((m) => m.RequesterBookPage),
  },
  {
    path: 'requester/appointment',
    title: 'นัดหมาย | LocalGo',
    canActivate: [authGuard],
    ...formGuard,
    loadComponent: () =>
      import('./pages/requester/appointment/appointment').then((m) => m.AppointmentPage),
  },
  {
    path: 'requester/appointments',
    pathMatch: 'full',
    redirectTo: 'requester',
  },
  {
    path: 'requester/appointments/:id',
    title: 'นัดหมาย | LocalGo',
    canActivate: [authGuard],
    data: { role: 'requester' },
    loadComponent: () =>
      import('./pages/shared/appointment-by-id').then((m) => m.AppointmentByIdPage),
  },
  {
    path: 'provider/appointments',
    pathMatch: 'full',
    redirectTo: 'provider/requests',
  },
  {
    path: 'provider/appointments/:id',
    title: 'นัดหมาย | LocalGo',
    canActivate: [authGuard],
    data: { role: 'provider' },
    loadComponent: () =>
      import('./pages/shared/appointment-by-id').then((m) => m.AppointmentByIdPage),
  },
  {
    path: 'requester/review',
    title: 'รีวิวและให้คะแนน | LocalGo',
    canActivate: [authGuard],
    ...formGuard,
    loadComponent: () => import('./pages/requester/review/review').then((m) => m.ReviewPage),
  },
  {
    path: 'provider',
    title: 'หน้าหลักผู้ให้บริการ | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/home/provider-home').then((m) => m.ProviderHomePage),
  },
  {
    path: 'provider/profile',
    title: 'โปรไฟล์ผู้ให้บริการ | LocalGo',
    canActivate: [authGuard],
    ...formGuard,
    loadComponent: () =>
      import('./pages/provider/profile/provider-profile').then((m) => m.ProviderProfileSetupPage),
  },
  {
    path: 'provider/service',
    title: 'เพิ่มบริการ | LocalGo',
    canActivate: [authGuard],
    ...formGuard,
    loadComponent: () =>
      import('./pages/provider/add-service/add-service').then((m) => m.AddServicePage),
  },
  {
    path: 'provider/service/:serviceId/edit',
    title: 'แก้ไขบริการ | LocalGo',
    canActivate: [authGuard],
    ...formGuard,
    loadComponent: () =>
      import('./pages/provider/edit-service/edit-service').then((m) => m.EditServicePage),
  },
  {
    path: 'provider/coverage',
    title: `${GLOSSARY.coverageAreaTitle} | LocalGo`,
    canActivate: [authGuard],
    ...formGuard,
    loadComponent: () => import('./pages/provider/coverage/coverage').then((m) => m.CoveragePage),
  },
  {
    path: 'provider/manage',
    title: 'บริการของฉัน | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/manage-services/manage-services').then((m) => m.ManageServicesPage),
  },
  {
    path: 'provider/my-bids',
    title: 'ข้อเสนอของฉัน | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/my-bids/my-bids').then((m) => m.ProviderMyBidsPage),
  },
  {
    path: 'provider/requests',
    title: 'งานที่ตรงกับบริการ | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/matching-requests/matching-requests').then(
        (m) => m.MatchingRequestsPage,
      ),
  },
  {
    path: 'provider/requests/:id',
    title: 'รายละเอียดงาน | LocalGo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/request-detail/request-detail').then(
        (m) => m.ProviderRequestDetailPage,
      ),
  },
  {
    path: 'provider/bid',
    title: `${GLOSSARY.submitBid} | LocalGo`,
    canActivate: [authGuard],
    ...formGuard,
    loadComponent: () =>
      import('./pages/provider/submit-bid/submit-bid').then((m) => m.SubmitBidPage),
  },
  {
    path: 'admin',
    title: 'หลังบ้านแอดมิน | LocalGo',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboardPage),
  },
  {
    path: '**',
    title: 'ไม่พบหน้า | LocalGo',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage),
  },
];
