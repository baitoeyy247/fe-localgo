import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/entry/entry').then((m) => m.EntryPage),
  },
  {
    path: 'requester',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/home/requester-home').then((m) => m.RequesterHomePage),
  },
  {
    path: 'requester/search',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/search/requester-search').then((m) => m.RequesterSearchPage),
  },
  {
    path: 'requester/provider/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/provider-profile/provider-profile').then((m) => m.ProviderProfilePage),
  },
  {
    path: 'requester/post',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/post-request/post-request').then((m) => m.PostRequestPage),
  },
  {
    path: 'requester/bids',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/private-bids/private-bids').then((m) => m.PrivateBidsPage),
  },
  {
    path: 'requester/book/:providerId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/book/book').then((m) => m.RequesterBookPage),
  },
  {
    path: 'requester/appointment',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/appointment/appointment').then((m) => m.AppointmentPage),
  },
  {
    path: 'requester/review',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/requester/review/review').then((m) => m.ReviewPage),
  },
  {
    path: 'requester/requests/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/requester/request-detail/request-detail').then(
        (m) => m.RequesterRequestDetailPage,
      ),
  },
  {
    path: 'provider',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/home/provider-home').then((m) => m.ProviderHomePage),
  },
  {
    path: 'provider/profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/profile/provider-profile').then((m) => m.ProviderProfileSetupPage),
  },
  {
    path: 'provider/service',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/add-service/add-service').then((m) => m.AddServicePage),
  },
  {
    path: 'provider/service/:serviceId/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/edit-service/edit-service').then((m) => m.EditServicePage),
  },
  {
    path: 'provider/coverage',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/provider/coverage/coverage').then((m) => m.CoveragePage),
  },
  {
    path: 'provider/manage',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/manage-services/manage-services').then((m) => m.ManageServicesPage),
  },
  {
    path: 'provider/services',
    redirectTo: '/provider/manage',
  },
  {
    path: 'provider/jobs',
    redirectTo: '/provider/requests',
  },
  {
    path: 'provider/my-bids',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/my-bids/my-bids').then((m) => m.ProviderMyBidsPage),
  },
  {
    path: 'provider/requests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/matching-requests/matching-requests').then(
        (m) => m.MatchingRequestsPage,
      ),
  },
  {
    path: 'provider/requests/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/request-detail/request-detail').then(
        (m) => m.ProviderRequestDetailPage,
      ),
  },
  {
    path: 'provider/bid',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/provider/submit-bid/submit-bid').then((m) => m.SubmitBidPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboardPage),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage),
  },
];
