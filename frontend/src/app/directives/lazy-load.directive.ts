import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
  selector: '[appLazyLoad]'
})
export class LazyLoadDirective implements OnInit {
  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    // TODO: Implement lazy loading
  }
}