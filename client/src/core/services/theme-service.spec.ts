import { ThemeService } from './theme-service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.removeItem('varsitymaps-theme');
    service = new ThemeService();
  });

  it('switches from system dark mode to light on the first toggle', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

    service.initialize();
    service.toggleTheme();

    expect(service.currentTheme()).toBe('light');
    expect(service.isDarkMode()).toBeFalse();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('switches from system light mode to dark on the first toggle', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);

    service.initialize();
    service.toggleTheme();

    expect(service.currentTheme()).toBe('dark');
    expect(service.isDarkMode()).toBeTrue();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
