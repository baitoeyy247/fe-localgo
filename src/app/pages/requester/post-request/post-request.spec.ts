import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { UserLocationService } from '../../../core/user-location.service';
import { PostRequestPage } from './post-request';

describe('PostRequestPage', () => {
  async function setup(categories: { id: string; name: string }[] | Error): Promise<ComponentFixture<PostRequestPage>> {
    const api = {
      listCategories: () => (categories instanceof Error ? throwError(() => categories) : of(categories)),
      createRequest: vi.fn(() => of({ id: 'req-1' })),
    };
    const location = {
      resolveSearchArea: () =>
        Promise.resolve({
          title: 'สยาม',
          subtitle: 'กรุงเทพ',
          radiusKm: 1,
          lat: 13.75,
          lng: 100.5,
        }),
      remember: () => undefined,
    };
    await TestBed.configureTestingModule({
      imports: [PostRequestPage],
      providers: [
        provideRouter([]),
        { provide: LocalGoApiService, useValue: api },
        { provide: UserLocationService, useValue: location },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PostRequestPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows a category option and field errors, then submits a complete form', async () => {
    const fixture = await setup([{ id: 'cat-1', name: 'ซักรีด' }]);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('select option').length).toBeGreaterThan(1);
    expect(element.textContent).toContain('ประกาศงาน');
    expect(element.textContent).not.toContain('0.0000, 0.0000');

    const button = element.querySelector('button.primary') as HTMLButtonElement;
    button.dispatchEvent(new Event('pointerdown'));
    fixture.detectChanges();
    expect(element.textContent).toContain('กรุณาเลือกหมวดหมู่');
    expect(element.textContent).toContain('กรุณากรอกหัวข้องาน');
    expect(element.textContent).toContain('กรุณากรอกรายละเอียด');

    fixture.componentInstance['selectCategory']('cat-1');
    fixture.componentInstance['updateTitle']('ซ่อมแอร์');
    fixture.componentInstance['updateDescription']('ห้องนอน');
    fixture.componentInstance['setBudgetMode']('amount');
    fixture.componentInstance['updateBudgetAmount']('abc');
    button.dispatchEvent(new Event('pointerdown'));
    fixture.detectChanges();
    expect(element.textContent).toContain('1 ถึง 1,000,000');

    fixture.componentInstance['updateBudgetAmount']('500');
    button.dispatchEvent(new Event('pointerdown'));
    await fixture.whenStable();
    const api = TestBed.inject(LocalGoApiService) as unknown as { createRequest: ReturnType<typeof vi.fn> };
    expect(api.createRequest).toHaveBeenCalled();
  });

  it('shows a retry when categories fail', async () => {
    const fixture = await setup(new Error('down'));
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('โหลดหมวดหมู่ไม่สำเร็จ');
    expect(element.textContent).toContain('ลองใหม่');
  });
});
