// -----------------------------------------------------------------------------
// js/components/segmented-control.js
// -----------------------------------------------------------------------------

export function createSegmentedControl({ options, activeValue, onChange }) {
    const container = document.createElement('div');
    container.className = 'segmented-control';

    // The sliding indicator
    const indicator = document.createElement('div');
    indicator.className = 'segmented-indicator';
    container.appendChild(indicator);

    let activeIndex = options.findIndex(opt => opt.value === activeValue);
    if (activeIndex === -1) activeIndex = 0;

    const buttons = options.map((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `segmented-item ${i === activeIndex ? 'active' : ''}`;
        btn.textContent = opt.label;
        btn.dataset.value = opt.value;

        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;

            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            _updateIndicator(indicator, i, options.length);
            onChange(opt.value);
        });

        container.appendChild(btn);
        return btn;
    });

    setTimeout(() => _updateIndicator(indicator, activeIndex, options.length), 0);

    return container;
}

function _updateIndicator(indicator, index, count) {
    const width = 100 / count;
    indicator.style.width = `calc(${width}% - 6px)`;
    indicator.style.transform = `translateX(calc(${index * 100}% + 3px))`;
}
