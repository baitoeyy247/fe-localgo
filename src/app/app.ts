import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineBar } from './shared/ui/offline-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OfflineBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
