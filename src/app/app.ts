import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineBar } from './shared/ui/offline-bar';
import { ToastHost } from './shared/ui/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OfflineBar, ToastHost],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
