import { Component } from '@angular/core';
import { Layout } from './shared/presentation/components/layout/layout';

@Component({
  selector: 'kt-root',
  imports: [Layout],
  template: `<kt-layout/>`,
})
export class App {}
