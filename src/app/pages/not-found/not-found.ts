import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageShell } from '../../demo/page-shell';

@Component({
  selector: 'app-not-found-page',
  imports: [PageShell, RouterLink],
  templateUrl: './not-found.html',
})
export class NotFoundPage {}
