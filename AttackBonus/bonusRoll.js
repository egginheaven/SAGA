const AttackBonusDeck = (() => {
    // 테이블 이름 
    const ALLY_DECK_NAME = "아군보너스";
    const ENEMY_DECK_NAME = "적군보너스";

    // 초기 카드 상태
    // value가 클수록 좋은 결과  
    const CARD_DEFINITIONS = {
        'Bonus_Bless':   { initialWeight: 0, value: 8, text: 'x2 (축복)' },
        'Bonus_x2':      { initialWeight: 1, value: 7, text: 'x2' },
        'Bonus_+2':      { initialWeight: 1, value: 6, text: '+2' },
        'Bonus_+1':      { initialWeight: 2, value: 5, text: '+1' },
        'Bonus_+0':      { initialWeight: 5, value: 4, text: '+0' },
        'Bonus_-1':      { initialWeight: 2, value: 3, text: '-1' },
        'Bonus_-2':      { initialWeight: 1, value: 2, text: '-2' },
        'Bonus_Curse':   { initialWeight: 0, value: 1, text: '0 (저주)' }
    };
    const ENEMY_DECK_EXCLUSIONS = ['Bonus_x2']; // 얘는 에너미 초기덱에서 제외 

    // 테이블을 초기 수량으로 리셋 
    const resetDeck = (tableName) => {
        // 테이블 이름으로 불러오기 
        const table = findObjs({ _type: 'rollabletable', name: tableName })[0];
        if (!table) {
            sendChat('SAGA', `/w gm "${tableName}" 테이블을 찾을 수 없습니다.`);
            return;
        }
        // 테이블에 있는 아이템 불러오기 (배열로)
        const items = findObjs({ _type: 'tableitem', _rollabletableid: table.id });
        const isEnemyDeck = tableName === ENEMY_DECK_NAME;

        // 아이템 하나씩 순회 
        items.forEach(item => {
            const cardName = item.get('name');
            const cardDef = CARD_DEFINITIONS[cardName]; // 아이템 이름으로 카드 정보(초기수량포함) 불러오기 
            if (cardDef) {
                let initialWeight = cardDef.initialWeight;
                if (isEnemyDeck && ENEMY_DECK_EXCLUSIONS.includes(cardName)) {
                    initialWeight = 0;
                }
                item.set({ weight: initialWeight }); // 초기 수량으로 weight 업데이트 
            }
        });
        log(`${tableName} 덱이 초기화 되었습니다.`);
        sendChat('SAGA', `${tableName} 덱이 초기화 되었습니다.`);
    };

    // 카드 뽑기 
    const drawCard = (tableName, callback) => {
        const rollCommand = `[[1t[${tableName}]]]`;
        sendChat('', rollCommand, (ops) => {
            try {
                const rollResult = ops[0];
                const tableItemData = rollResult.inlinerolls[0].results.rolls[0].results[0].tableItem;

                if (tableItemData) {
                    const rolledItemId = tableItemData.id;
                    const item = getObj('tableitem', rolledItemId);

                    if (!item) {
                        log(`공격보너스 굴림 오류: 테이블에서 아이템 ID: ${rolledItemId}를 찾을 수 없습니다.`);
                        return;
                    }
                    
                    const currentWeight = item.get('weight');
                    item.set('weight', Math.max(0, currentWeight - 1));
                    
                    const rawAvatarURL = item.get('avatar');
                    let finalImageURL = '';

                    if (rawAvatarURL) {
                        let highResURL = rawAvatarURL.replace('/thumb/', '/max/');
                        finalImageURL = highResURL.split('?')[0];
                    }

                    // log(`[DEBUG] 최종 이미지 URL: ${finalImageURL}`);

                    const cardName = item.get('name');
                    const cardData = {
                        name: cardName,
                        text: CARD_DEFINITIONS[cardName].text,
                        value: CARD_DEFINITIONS[cardName].value,
                        iconURL: finalImageURL
                    };
                    
                    if (cardName === 'Bonus_Bless' || cardName === 'Bonus_Curse') {
                        sendChat('SAGA', `축복/저주 카드를 뽑았습니다. 덱을 초기화합니다.`);
                        resetDeck(tableName);
                    }
                    callback(cardData);
                } else {
                    log('AttackBonusDeck Error: Could not find tableItem in the roll result.');
                    log('Received ops: ' + JSON.stringify(ops));
                    sendChat('SAGA', `테이블[${tableName}] 결과 분석에 실패했습니다.`);
                }
            } catch (err) {
                log("AttackBonusDeck Error: Failed to parse roll result. Error: " + err.message);
                log('Received ops: ' + JSON.stringify(ops));
                sendChat('SAGA', `gm "테이블[${tableName}] 결과 분석 중 예외가 발생했습니다.`);
            }
        }, { noarchive: true });
    };

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
             sendChat('SAGA', `/w gm "${tableName}" 테이블을 찾을 수 없습니다.`);
             return;
        }
        const items = findObjs({ _type: 'tableitem', _rollabletableid: table.id });
        const totalWeight = items.reduce((sum, item) => sum + parseInt(item.get('weight') || 0), 0);
        
        if (totalWeight < drawCount) {
            sendChat('SAGA', `뽑을 카드가 부족하여 (${totalWeight}/${drawCount}) 덱을 초기화합니다.`);
            resetDeck(tableName);
        }

        let drawnCards = [];
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
                finalCard = drawnCards.sort((a, b) => a.value - b.value)[drawnCards.length - 1];
            } else if (mode === 'disadvantage') {
                title += ' (불리함)';
                finalCard = drawnCards.sort((a, b) => a.value - b.value)[0];
            } else {
                finalCard = drawnCards[0];
            }

            let templateContent = `&{template:attackbonus} {{title=${title}}}`;
            drawnCards.forEach((card, index) => {
                templateContent += ` {{roll${index}Icon=${card.iconURL}}}`;
            });
            templateContent += `{{finalName=${finalCard.text}}}`;
            
            sendChat(who, templateContent);
        };
        
        performDraws(drawCount);
    };
    
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