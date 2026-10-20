import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { AppointmentDetail, ProviderDetail, ServiceRequestDetail } from '../../../core/models';
import { ProviderRequestDetailPage } from './request-detail';

type Phase = 'Pending' | 'Confirmed' | 'InProgress' | 'Completed';

describe('ProviderRequestDetailPage job completion', () => {
  let phase: Phase;

  const provider: ProviderDetail = {
    id: 'prov-1',
    providerType: 'Individual',
    name: 'ครูสอนพิเศษ',
    status: 'Active',
    averageVerifiedRating: 0,
    averagePublicRating: 0,
    verifiedReviewCount: 0,
    publicReviewCount: 0,
    branches: [],
    services: [],
  };

  function requestStatus(current: Phase): string {
    if (current === 'Pending' || current === 'Confirmed') {
      return 'Scheduled';
    }
    return current;
  }

  function makeRequest(): ServiceRequestDetail {
    return {
      id: 'req-1',
      title: 'รับสอนพิเศษ เขียนโปรแกรมม',
      categoryId: 'cat-1',
      categoryName: 'ติวเตอร์และสอนพิเศษ',
      status: requestStatus(phase),
      latitude: 13.75,
      longitude: 100.5,
      searchRadiusMeters: 5000,
      budgetText: '599 บาท',
      selectedProviderId: provider.id,
      createdAt: '2026-10-21T00:00:00Z',
      updatedAt: '2026-10-21T00:00:00Z',
      bids: [],
    };
  }

  function makeAppointment(): AppointmentDetail {
    return {
      id: 'appt-1',
      serviceRequestId: 'req-1',
      providerId: provider.id,
      requesterUserId: 'user-1',
      scheduledAt: '2026-10-21T18:00:00Z',
      addressText: 'บ้านลูกค้า',
      status: phase,
      createdAt: '2026-10-21T00:00:00Z',
      updatedAt: '2026-10-21T00:00:00Z',
    };
  }

  const api = {
    getRequest: vi.fn(() => of(makeRequest())),
    getMyProvider: vi.fn(() => of(provider)),
    getAppointment: vi.fn(() => of(makeAppointment())),
    updateAppointmentStatus: vi.fn((_id: string, status: Phase) => {
      phase = status;
      return of(makeAppointment());
    }),
  };

  async function render(): Promise<ComponentFixture<ProviderRequestDetailPage>> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProviderRequestDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'req-1' }) } },
        },
        { provide: LocalGoApiService, useValue: api },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProviderRequestDetailPage);
    fixture.detectChanges();
    await fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    phase = 'Confirmed';
    api.getRequest.mockClear();
    api.getMyProvider.mockClear();
    api.getAppointment.mockClear();
    api.updateAppointmentStatus.mockClear();
    vi.stubGlobal('confirm', () => {
      throw new Error('native confirm should not be used');
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows start after confirmation, then complete, then the review handoff', async () => {
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('เริ่มงาน');
    expect(root.textContent).not.toContain('ยืนยันรับนัดหมาย');
    expect(root.textContent).not.toContain('ส่งข้อเสนอราคา');

    buttonByText(root, 'เริ่มงาน').click();
    fixture.detectChanges();
    buttonByText(root, 'ยืนยัน').click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(api.updateAppointmentStatus).toHaveBeenCalledWith('appt-1', 'InProgress');
      expect(root.textContent).toContain('งานเสร็จสิ้น');
      expect(root.textContent).toContain('กำลังดำเนินงาน');
    });

    buttonByText(root, 'งานเสร็จสิ้น').click();
    fixture.detectChanges();
    buttonByText(root, 'ยืนยัน').click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(api.updateAppointmentStatus).toHaveBeenCalledWith('appt-1', 'Completed');
      expect(root.textContent).toContain('ลูกค้าสามารถให้คะแนนและรีวิวได้');
      expect(root.textContent).toContain('เสร็จสิ้น');
    });
  });

  it('shows confirm while the appointment is still pending', async () => {
    phase = 'Pending';
    const fixture = await render();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('ยืนยันรับนัดหมาย');
    expect(root.textContent).not.toContain('เริ่มงาน');
  });
});

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll('button')).find((el) =>
    (el.textContent ?? '').includes(text),
  );
  if (!button) {
    throw new Error(`missing button ${text}`);
  }
  return button as HTMLButtonElement;
}
