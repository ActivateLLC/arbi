import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="py-32 relative bg-black">
      <div class="max-w-7xl mx-auto px-6 relative z-10">
        
        <div class="mb-20 comp-header opacity-0">
          <h2 class="text-4xl font-syne font-bold text-white uppercase mb-2">System <span class="text-[#00f0ff]">Benchmark</span></h2>
          <div class="h-1 w-20 bg-[#00f0ff]"></div>
        </div>

        <!-- Terminal Window -->
        <div class="border border-white/20 bg-black cyber-clip relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-8 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
             <div class="w-2 h-2 rounded-full bg-red-500"></div>
             <div class="w-2 h-2 rounded-full bg-yellow-500"></div>
             <div class="w-2 h-2 rounded-full bg-green-500"></div>
             <div class="ml-auto text-[10px] font-mono text-slate-500">ROOT ACCESS // COMPARISON_MATRIX.EXE</div>
          </div>

          <div class="p-8 pt-12 overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[700px] font-mono text-sm">
              <thead>
                <tr class="border-b border-white/20">
                  <th class="py-6 px-4 text-[#00f0ff] uppercase tracking-widest">Parameter</th>
                  <th class="py-6 px-4 text-slate-500 uppercase tracking-widest text-center">Competitor A</th>
                  <th class="py-6 px-4 text-slate-500 uppercase tracking-widest text-center">Competitor B</th>
                  <th class="py-6 px-4 text-black bg-[#00f0ff] uppercase tracking-widest text-center font-bold cyber-clip-sm">ARBI PROTOCOL</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr #compRow class="opacity-0">
                  <td class="py-6 px-4 text-white">Cost Efficiency</td>
                  <td class="py-6 px-4 text-center text-slate-500">$49-99</td>
                  <td class="py-6 px-4 text-center text-slate-500">$49</td>
                  <td class="py-6 px-4 text-center text-[#00f0ff] border-x border-[#00f0ff]/20 bg-[#00f0ff]/5 font-bold">$49-197</td>
                </tr>
                <tr #compRow class="opacity-0">
                  <td class="py-6 px-4 text-white">Data Stream</td>
                  <td class="py-6 px-4 text-center text-slate-500">Single Source</td>
                  <td class="py-6 px-4 text-center text-slate-500">Basic</td>
                  <td class="py-6 px-4 text-center text-[#00f0ff] border-x border-[#00f0ff]/20 bg-[#00f0ff]/5 font-bold">Multi-Vector API</td>
                </tr>
                <tr #compRow class="opacity-0">
                  <td class="py-6 px-4 text-white">AI Core</td>
                  <td class="py-6 px-4 text-center text-red-900">OFFLINE</td>
                  <td class="py-6 px-4 text-center text-red-900">OFFLINE</td>
                  <td class="py-6 px-4 text-center text-[#00f0ff] border-x border-[#00f0ff]/20 bg-[#00f0ff]/5 font-bold animate-pulse">ONLINE</td>
                </tr>
                <tr #compRow class="opacity-0">
                  <td class="py-6 px-4 text-white">Auto-Exec</td>
                  <td class="py-6 px-4 text-center text-slate-500">Manual</td>
                  <td class="py-6 px-4 text-center text-slate-500">Manual</td>
                  <td class="py-6 px-4 text-center text-[#00f0ff] border-x border-[#00f0ff]/20 bg-[#00f0ff]/5 font-bold">Autonomous</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div #featureBox class="p-8 border border-white/10 bg-white/5 cyber-clip hover:border-[#7000ff] transition-colors group opacity-0">
             <h3 class="text-xl font-bold mb-2 text-white font-syne uppercase">Pay-Per-Opp</h3>
             <p class="text-slate-400 text-xs mb-4 font-mono">Pay only for valid leads. Zero monthly commitment.</p>
             <div class="text-[#7000ff] font-bold text-sm uppercase tracking-widest">$0.10 / Unit Found</div>
           </div>

           <div #featureBox class="p-8 border border-white/10 bg-white/5 cyber-clip hover:border-[#00f0ff] transition-colors group opacity-0">
             <h3 class="text-xl font-bold mb-2 text-white font-syne uppercase">Rev Share</h3>
             <p class="text-slate-400 text-xs mb-4 font-mono">Zero-cost entry vector. We only win when you win.</p>
             <div class="text-[#00f0ff] font-bold text-sm uppercase tracking-widest">5-15% Commission</div>
           </div>
        </div>

      </div>
    </section>
  `
})
export class ComparisonComponent implements AfterViewInit {
  @ViewChildren('compRow') compRows!: QueryList<ElementRef>;
  @ViewChildren('featureBox') featureBoxes!: QueryList<ElementRef>;

  ngAfterViewInit() {
    gsap.to('.comp-header', {
      scrollTrigger: { trigger: '.comp-header', start: 'top 85%' },
      opacity: 1, y: 0, duration: 1
    });

    const rows = this.compRows.toArray().map(el => el.nativeElement);
    gsap.to(rows, {
      scrollTrigger: { trigger: rows[0], start: 'top 80%' },
      opacity: 1, x: 0, duration: 0.5, stagger: 0.1
    });

    const boxes = this.featureBoxes.toArray().map(el => el.nativeElement);
    gsap.to(boxes, {
      scrollTrigger: { trigger: boxes[0], start: 'top 90%' },
      opacity: 1, y: 0, duration: 0.8, stagger: 0.2
    });
  }
}