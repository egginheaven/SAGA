const AttackBonusDeck = (() => {
    // Rollable Table 이름 
    const ALLY_DECK_NAME = "아군-보너스";
    const ENEMY_DECK_NAME = "적군-보너스";

    // 초기 수량
    // value가 높을수록 좋은 결과로 분류 
    const CARD_DEFINITIONS = {
        'Bonus_Bless':   { initialWeight: 0, value: 8, text: 'x2' },
        'Bonus_x2':         { initialWeight: 1, value: 7, text: 'x2' },
        'Bonus_+2':         { initialWeight: 1, value: 6, text: '+2' },
        'Bonus_+1':         { initialWeight: 2, value: 5, text: '+1' },
        'Bonus_+0':         { initialWeight: 5, value: 4, text: '+0' },
        'Bonus_-1':         { initialWeight: 2, value: 3, text: '-1' },
        'Bonus_-2':         { initialWeight: 1, value: 2, text: '-2' },
        'Bonus_Curse':{ initialWeight: 0, value: 1, text: '0' }
    };

    // 에너미 덱에서 제외할 카드
    const ENEMY_DECK_EXCLUSIONS = ['Bonus_x2'];

    // 덱을 초기화하는 함수 
    const resetDeck = (tableName) => {
        const table = findObjs({ _type: 'rollabletable', name: tableName })[0];
        if (!table) {
            sendChat('System', `/w gm "${tableName}" 테이블을 찾을 수 없습니다. 테이블을 올바르게 생성했는지 확인해주세요.`);
            return;
        }

        // 기존 아이템 모두 삭제
        const existingItems = findObjs({ _type: 'tableitem', _rollabletableid: table.id });
        const itemsByName = existingItems.reduce((acc, item) => {
            acc[item.get('name')] = item;
            return acc;
        }, {});

        // 초기화
        for (const cardName in CARD_DEFINITIONS) {
            let initialWeight = CARD_DEFINITIONS[cardName].initialWeight;
            
            // 에너미 덱에서 제외되는 카드 
            if (tableName === ENEMY_DECK_NAME && ENEMY_DECK_EXCLUSIONS.includes(cardName)) {
                initialWeight = 0;
            }

            const existingItem = itemsByName[cardName];

            if (existingItem) {
                // 아이템이 이미 존재하면 weight만 업뎃 
                existingItem.set('weight', initialWeight);
            } else {
                // 아이템이 존재하지 않으면 새로 생성 [DEBUG] 이미지도 넣어야 됨! 
                createObj('tableitem', {
                    name: cardName,
                    rollabletableid: table.id,
                    weight: initialWeight
                });
            }
        }
        log(`"${tableName}" 덱의 카드가 소진되어 초기화되었습니다.`);
        sendChat('System', `/w gm "${tableName}" 덱의 카드가 소진되어 초기화되었습니다.`);
    };

    // 덱에서 카드 1장 뽑기 
    const drawCard = (tableName, callback) => {
        const table = findObjs({ _type: 'rollabletable', name: tableName })[0];
        if (!table) return;

        table.roll((result) => {
            const rolledItemId = result.roll.tabletop.id;
            const item = getObj('tableitem', rolledItemId);
            
            // 뽑힌 카드의 비중을 1 감소
            const currentWeight = item.get('weight');
            item.set('weight', Math.max(0, currentWeight - 1));

            const cardName = item.get('name');
            const cardData = {
                name: cardName,
                text: CARD_DEFINITIONS[cardName].text,
                value: CARD_DEFINITIONS[cardName].value,
                iconURL: item.get('avatar')
            };
            
            // 축복 또는 저주 카드인 경우, 사용 후 덱 리셋
            if (cardName === 'Bonus_x2_Bless' || cardName === 'Bonus_Skull_Curse') {
                sendChat('System', `/w gm "축복/저주 카드를 뽑았습니다. 덱을 초기화합니다."`);
                resetDeck(tableName);
            }
            
            callback(cardData);
        });
    };

    // 채팅 메시지 감지 및 처리
    const handleMessage = (msg) => {
        if (msg.type !== 'api' || !msg.content.startsWith('!공격보너스')) return;

        const args = msg.content.split(/\s+/);
        const who = (msg.selected && msg.selected[0]) ? getObj(msg.selected[0]._type, msg.selected[0]._id).get('name') : msg.who;
        
        let mode = 'normal';
        if (args.includes('유리함')) mode = 'advantage';
        if (args.includes('불리함')) mode = 'disadvantage';
        
        const tableName = args.includes('적') ? ENEMY_DECK_NAME : ALLY_DECK_NAME;
        const drawCount = (mode === 'normal') ? 1 : 3;

        const table = findObjs({ _type: 'rollabletable', name: tableName })[0];
        if (!table) {
            sendChat('System', `/w gm "${tableName}" 테이블을 찾을 수 없습니다. 테이블 이름을 확인해주세요.`);
            return;
        }

        const items = findObjs({ _type: 'tableitem', _rollabletableid: table.id });
        const totalWeight = items.reduce((sum, item) => sum + parseInt(item.get('weight') || 0), 0);

        // 뽑아야 할 카드보다 남은 카드가 적으면 덱을 리셋 
        if (totalWeight < drawCount) {
            sendChat('System', `/w gm "뽑을 카드가 부족하여 (${totalWeight}/${drawCount}) 덱을 초기화합니다."`);
            resetDeck(tableName);
        }
        
        let drawnCards = [];

        // 비동기 드로우 처리
        const performDraws = (count) => {
            if (count <= 0) {
                processResults();
                return;
            }
            drawCard(tableName, (card) => {
                drawnCards.push(card);
                performDraws(count - 1);
            });
        };

        const processResults = () => {
            let finalCard;
            let title = `${who}의 공격 보너스`;

            if (mode === 'advantage') {
                title += ' (유리함)';
                drawnCards.sort((a, b) => a.value - b.value); // 오름차순 정렬
                finalCard = drawnCards[drawnCards.length - 1]; // 가장 좋은결과 
            } else if (mode === 'disadvantage') {
                title += ' (불리함)';
                drawnCards.sort((a, b) => a.value - b.value); // 오름차순 정렬
                finalCard = drawnCards[0]; // 가장 나쁜 결과 
            } else {
                finalCard = drawnCards[0];
            }

            // 롤 템플릿에 보낼 데이터들 ... 
            let templateContent = `&{template:attackbonus} {{title=${title}}}`;
            
            drawnCards.forEach((card, index) => {
                templateContent += ` {{roll${index}Icon=${card.iconURL}}} {{roll${index}Name=${card.text}}}`;
            });

            templateContent += `{{finalName=${finalCard.text}}}`;
            
            sendChat(who, templateContent);
        };
        
        performDraws(drawCount);
    };
    
    // API가 준비되면 이벤트 리스너 등록
    const registerEventHandlers = () => {
        on('chat:message', handleMessage);
        log('공격 보너스 API Ready.');
    };

    return {
        RegisterEventHandlers: registerEventHandlers
    };
})();

on('ready', () => {
    AttackBonusDeck.RegisterEventHandlers();
});