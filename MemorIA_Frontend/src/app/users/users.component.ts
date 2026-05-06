import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserPayload, UserResponse } from '../models/user.model';
import { UserService } from '../services/user.service';
import { AuthService } from '../auth/auth.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { InputSwitchModule } from 'primeng/inputswitch';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    CardModule,
    ChartModule,
    InputSwitchModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    DividerModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  users: UserResponse[] = [];
  isLoading = false;
  isSaving = false;
  editingUserId: number | null = null;
  editDialogVisible = false;

  stats = { total: 0, active: 0, inactive: 0, profileCompleted: 0 };
  roleChartData: any = null;
  statusChartData: any = null;
  chartOptions: any = null;
  barChartOptions: any = null;

  roleOptions = [
    { label: 'Patient', value: 'PATIENT' },
    { label: 'Soignant', value: 'SOIGNANT' },
    { label: 'Accompagnant', value: 'ACCOMPAGNANT' },
    { label: 'Administrateur', value: 'ADMINISTRATEUR' }
  ];

  statusOptions = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false }
  ];

  profileOptions = [
    { label: 'Completed', value: true },
    { label: 'Incomplete', value: false }
  ];

  private readonly fb = inject(FormBuilder);

  editForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, Validators.minLength(8)]],
    role: ['PATIENT', [Validators.required]],
    actif: [true, [Validators.required]],
    profileCompleted: [false, [Validators.required]],
    password: ['']
  });

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly confirmationService: ConfirmationService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
        this.computeStats();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Unable to load users. Admin access is required.'
        });
        this.isLoading = false;
      }
    });
  }

  computeStats(): void {
    const total = this.users.length;
    const active = this.users.filter(u => u.actif).length;
    const inactive = total - active;
    const profileCompleted = this.users.filter(u => u.profileCompleted).length;
    this.stats = { total, active, inactive, profileCompleted };

    const roleColors: Record<string, string> = {
      PATIENT: '#6366f1',
      SOIGNANT: '#22c55e',
      ACCOMPAGNANT: '#f59e0b',
      ADMINISTRATEUR: '#ef4444'
    };

    const roleCounts: Record<string, number> = {};
    this.users.forEach(u => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });

    const roles = Object.keys(roleCounts);

    this.roleChartData = {
      labels: roles,
      datasets: [{
        data: roles.map(r => roleCounts[r]),
        backgroundColor: roles.map(r => roleColors[r] ?? '#94a3b8'),
        hoverOffset: 6
      }]
    };

    this.statusChartData = {
      labels: roles,
      datasets: [
        {
          label: 'Active',
          data: roles.map(r => this.users.filter(u => u.role === r && u.actif).length),
          backgroundColor: '#22c55e'
        },
        {
          label: 'Inactive',
          data: roles.map(r => this.users.filter(u => u.role === r && !u.actif).length),
          backgroundColor: '#ef4444'
        }
      ]
    };

    this.chartOptions = {
      plugins: { legend: { position: 'bottom' } },
      responsive: true,
      maintainAspectRatio: false
    };

    this.barChartOptions = {
      plugins: { legend: { position: 'top' } },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    };
  }

  startEdit(user: UserResponse): void {
    this.editingUserId = user.id;
    this.editForm.setValue({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      role: user.role,
      actif: user.actif,
      profileCompleted: user.profileCompleted,
      password: ''
    });
    this.editDialogVisible = true;
  }

  cancelEdit(): void {
    this.editDialogVisible = false;
    this.editingUserId = null;
    this.editForm.reset({
      nom: '', prenom: '', email: '', telephone: '',
      role: 'PATIENT', actif: true, profileCompleted: false, password: ''
    });
  }

  saveEdit(): void {
    if (this.editingUserId === null) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload: UserPayload = this.editForm.getRawValue();

    this.userService.updateUser(this.editingUserId, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'User updated successfully.' });
        this.isSaving = false;
        this.cancelEdit();
        this.loadUsers();
      },
      error: (error) => {
        const messages: Record<number, string> = {
          409: 'This email is already in use.',
          403: 'Admin privileges are required.',
          400: 'Please verify all fields before saving.'
        };
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: messages[error?.status] ?? 'Unable to update user.'
        });
        this.isSaving = false;
      }
    });
  }

  deleteUser(user: UserResponse): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${user.prenom} ${user.nom}</strong>? This action cannot be undone.`,
      header: 'Delete User',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      acceptIcon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      rejectLabel: 'Cancel',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'User deleted successfully.' });
            this.loadUsers();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to delete user.' });
          }
        });
      }
    });
  }

  confirmUser(user: UserResponse): void {
    this.userService.confirmUser(user.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Email Sent',
          detail: `Confirmation email sent to ${user.email}.`
        });
        this.loadUsers();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.status === 403 ? 'Admin privileges are required.' : 'Unable to send confirmation email.'
        });
      }
    });
  }

  getRoleSeverity(role: string): 'info' | 'success' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      PATIENT: 'info',
      SOIGNANT: 'success',
      ACCOMPAGNANT: 'warning',
      ADMINISTRATEUR: 'danger'
    };
    return map[role] ?? 'secondary';
  }

  get profileCompletionRate(): number {
    return this.stats.total > 0 ? Math.round((this.stats.profileCompleted / this.stats.total) * 100) : 0;
  }

  exportExcel(): void {
    import('xlsx').then(xlsx => {
      const source = this.dt.filteredValue ?? this.users;
      const rows = source.map(u => ({
        'ID': u.id,
        'First Name': u.prenom,
        'Last Name': u.nom,
        'Email': u.email,
        'Phone': u.telephone,
        'Role': u.role,
        'Status': u.actif ? 'Active' : 'Inactive',
        'Profile Completed': u.profileCompleted ? 'Yes' : 'No'
      }));

      const worksheet = xlsx.utils.json_to_sheet(rows);

      // Auto-fit column widths
      const colKeys = Object.keys(rows[0] ?? {}) as (keyof (typeof rows)[0])[];
      worksheet['!cols'] = colKeys.map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 2
      }));

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');
      xlsx.writeFile(workbook, `MemoriA_Users_${new Date().toISOString().slice(0, 10)}.xlsx`);

      this.messageService.add({ severity: 'success', summary: 'Excel exported', detail: `${rows.length} users exported.` });
    });
  }

  exportPdf(): void {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const source = this.dt.filteredValue ?? this.users;

        const body = source.map(u => [
          u.id,
          `${u.prenom} ${u.nom}`,
          u.email,
          u.telephone,
          u.role,
          u.actif ? 'Active' : 'Inactive',
          u.profileCompleted ? 'Yes' : 'No'
        ]);

        // Title
        doc.setFontSize(18);
        doc.setTextColor(46, 26, 71);
        doc.text('MemoriA – User Management Report', 14, 18);

        // Sub-title
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Generated: ${new Date().toLocaleDateString('en-GB')}   |   Total records: ${body.length}`,
          14, 26
        );

        (doc as any).autoTable({
          head: [['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Profile']],
          body,
          startY: 32,
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [108, 46, 185], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 245, 255] },
          columnStyles: {
            0: { cellWidth: 14 },
            2: { cellWidth: 52 }
          },
          margin: { left: 14, right: 14 }
        });

        doc.save(`MemoriA_Users_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.messageService.add({ severity: 'success', summary: 'PDF exported', detail: `${body.length} users exported.` });
      });
    });
  }

  goToSignup(): void {
    this.router.navigate(['/signup']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
