import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS } from '../../core/models/role-labels';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly menuOpen = signal(false);
  // ouvert par défaut sur desktop, replié sur mobile pour ne pas cacher tout le contenu au chargement
  protected readonly sidebarOpen = signal(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  );

  protected readonly roleLabel = computed(() => {
    const role = this.currentUser()?.role;
    return role ? ROLE_LABELS[role] : '';
  });

  protected readonly initials = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  // sur desktop la sidebar repliée reste utile (icônes visibles) donc on ne la ferme
  // qu'au clic explicite sur le chevron ; sur mobile un lien doit la refermer, sinon
  // elle reste ouverte au-dessus de la page suivante
  protected onNavLinkClick(): void {
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
      this.closeSidebar();
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  // pas de lib de dropdown, donc on gère le clic extérieur à la main
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('[data-user-menu]')) {
      this.menuOpen.set(false);
    }
  }

  protected logout(): void {
    this.authService.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }

  private readonly mainEl = viewChild<ElementRef<HTMLElement>>('mainEl');
  protected readonly atBottom = signal(false);

  protected onMainScroll(): void {
    const el = this.mainEl()?.nativeElement;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.atBottom.set(distanceToBottom < 40);
  }

  protected scrollToggle(): void {
    const el = this.mainEl()?.nativeElement;
    if (!el) return;
    el.scrollTo({ top: this.atBottom() ? 0 : el.scrollHeight, behavior: 'smooth' });
  }
}
